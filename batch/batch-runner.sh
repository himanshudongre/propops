#!/bin/bash

# PropOps Batch Runner
# Reads batch-input.tsv and spawns parallel claude -p workers
#
# Usage:
#   ./batch/batch-runner.sh                    # Process all pending
#   ./batch/batch-runner.sh --parallel 3       # 3 concurrent workers
#   ./batch/batch-runner.sh --dry-run          # Preview without executing
#   ./batch/batch-runner.sh --retry-failed     # Retry failed entries
#   ./batch/batch-runner.sh --max-retries 2    # Max retries per entry
#
# Input:  batch/batch-input.tsv (id\turl\tproject\tbuilder\tnotes)
# State:  batch/batch-state.tsv (tracks progress, enables resume)
# Output: reports/*.md, batch/tracker-additions/*.tsv, batch/logs/*.log

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
INPUT_FILE="$ROOT_DIR/batch/batch-input.tsv"
STATE_FILE="$ROOT_DIR/batch/batch-state.tsv"
PROMPT_FILE="$ROOT_DIR/batch/batch-prompt.md"
LOG_DIR="$ROOT_DIR/batch/logs"
ADDITIONS_DIR="$ROOT_DIR/batch/tracker-additions"

# Defaults
PARALLEL=2
DRY_RUN=false
RETRY_FAILED=false
MAX_RETRIES=1

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --parallel) PARALLEL="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --retry-failed) RETRY_FAILED=true; shift ;;
    --max-retries) MAX_RETRIES="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# Ensure directories exist
mkdir -p "$LOG_DIR" "$ADDITIONS_DIR"

# ─── State Management ────────────────────────────────────────

init_state() {
  if [[ ! -f "$STATE_FILE" ]]; then
    echo -e "id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries" > "$STATE_FILE"
  fi
}

get_state() {
  local id="$1"
  grep -P "^${id}\t" "$STATE_FILE" 2>/dev/null | tail -1 || echo ""
}

set_state() {
  local id="$1" url="$2" status="$3" started="$4" completed="$5" report_num="$6" score="$7" error="$8" retries="$9"

  # Remove existing entry for this ID
  if grep -qP "^${id}\t" "$STATE_FILE" 2>/dev/null; then
    grep -vP "^${id}\t" "$STATE_FILE" > "${STATE_FILE}.tmp" || true
    mv "${STATE_FILE}.tmp" "$STATE_FILE"
  fi

  echo -e "${id}\t${url}\t${status}\t${started}\t${completed}\t${report_num}\t${score}\t${error}\t${retries}" >> "$STATE_FILE"
}

# ─── Report Number ───────────────────────────────────────────

next_report_num() {
  local max=0
  if [[ -d "$ROOT_DIR/reports" ]]; then
    for f in "$ROOT_DIR/reports"/*.md; do
      [[ -f "$f" ]] || continue
      local num
      num=$(basename "$f" | grep -oP '^\d+' || echo "0")
      if [[ "$num" -gt "$max" ]]; then
        max="$num"
      fi
    done
  fi

  # Also check state file
  while IFS=$'\t' read -r _ _ _ _ _ rnum _ _ _; do
    if [[ "$rnum" =~ ^[0-9]+$ ]] && [[ "$rnum" -gt "$max" ]]; then
      max="$rnum"
    fi
  done < <(tail -n +2 "$STATE_FILE" 2>/dev/null || true)

  printf "%03d" $((max + 1))
}

# ─── Worker ──────────────────────────────────────────────────

run_worker() {
  local id="$1" url="$2" project="$3" builder="$4" notes="$5"
  local report_num
  report_num=$(next_report_num)
  local date
  date=$(date +%Y-%m-%d)
  local log_file="$LOG_DIR/${report_num}-${id}.log"

  echo "[Worker ${id}] Starting: ${project} (report #${report_num})"

  set_state "$id" "$url" "processing" "$(date -Iseconds)" "" "$report_num" "" "" "0"

  if $DRY_RUN; then
    echo "[Worker ${id}] DRY RUN — would evaluate: $url"
    set_state "$id" "$url" "dry-run" "$(date -Iseconds)" "$(date -Iseconds)" "$report_num" "N/A" "" "0"
    return 0
  fi

  # Build the prompt with placeholders replaced
  local prompt
  prompt=$(cat "$PROMPT_FILE")
  prompt="${prompt//\{\{URL\}\}/$url}"
  prompt="${prompt//\{\{REPORT_NUM\}\}/$report_num}"
  prompt="${prompt//\{\{DATE\}\}/$date}"
  prompt="${prompt//\{\{ID\}\}/$id}"

  # Run claude -p worker
  if echo "$prompt" | claude -p --output-format json > "$log_file" 2>&1; then
    echo "[Worker ${id}] Completed successfully"
    set_state "$id" "$url" "completed" "$(date -Iseconds)" "$(date -Iseconds)" "$report_num" "" "" "0"
  else
    local retries
    retries=$(get_state "$id" | cut -f9)
    retries=${retries:-0}
    retries=$((retries + 1))
    echo "[Worker ${id}] FAILED (retry ${retries}/${MAX_RETRIES})"
    set_state "$id" "$url" "failed" "$(date -Iseconds)" "$(date -Iseconds)" "$report_num" "" "worker_error" "$retries"
  fi
}

# ─── Main ────────────────────────────────────────────────────

main() {
  init_state

  if [[ ! -f "$INPUT_FILE" ]]; then
    echo "ERROR: $INPUT_FILE not found."
    echo "Create batch-input.tsv with columns: id, url, project, builder, notes"
    exit 1
  fi

  # Count entries
  local total
  total=$(tail -n +2 "$INPUT_FILE" 2>/dev/null | wc -l | tr -d ' ')
  echo "PropOps Batch Runner"
  echo "Input: $total properties"
  echo "Parallelism: $PARALLEL"
  echo "Dry run: $DRY_RUN"
  echo "---"

  # Process entries
  local running=0
  local processed=0

  while IFS=$'\t' read -r id url project builder notes; do
    [[ "$id" == "id" ]] && continue  # Skip header
    [[ -z "$id" ]] && continue

    # Check if already completed
    local state
    state=$(get_state "$id")
    if [[ -n "$state" ]]; then
      local status
      status=$(echo "$state" | cut -f3)
      if [[ "$status" == "completed" ]]; then
        echo "[Skip] #${id} already completed"
        continue
      fi
      if [[ "$status" == "failed" ]] && ! $RETRY_FAILED; then
        echo "[Skip] #${id} failed (use --retry-failed to retry)"
        continue
      fi
    fi

    # Wait if at max parallelism
    while [[ $running -ge $PARALLEL ]]; do
      wait -n 2>/dev/null || true
      running=$((running - 1))
    done

    # Spawn worker
    run_worker "$id" "$url" "$project" "$builder" "$notes" &
    running=$((running + 1))
    processed=$((processed + 1))

  done < "$INPUT_FILE"

  # Wait for remaining workers
  wait

  echo ""
  echo "---"
  echo "Batch complete: $processed processed"
  echo ""
  echo "Next steps:"
  echo "  1. node scripts/merge-tracker.mjs    # Merge results into tracker"
  echo "  2. node scripts/verify-pipeline.mjs  # Health check"
}

main "$@"
