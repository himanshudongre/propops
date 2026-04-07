package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// ─── Theme (Catppuccin Mocha) ───────────────────────────────

var (
	colorBase     = lipgloss.Color("#1e1e2e")
	colorSurface  = lipgloss.Color("#313244")
	colorOverlay  = lipgloss.Color("#45475a")
	colorText     = lipgloss.Color("#cdd6f4")
	colorSubtext  = lipgloss.Color("#a6adc8")
	colorGreen    = lipgloss.Color("#a6e3a1")
	colorYellow   = lipgloss.Color("#f9e2af")
	colorRed      = lipgloss.Color("#f38ba8")
	colorBlue     = lipgloss.Color("#89b4fa")
	colorMauve    = lipgloss.Color("#cba6f7")
	colorTeal     = lipgloss.Color("#94e2d5")
	colorPeach    = lipgloss.Color("#fab387")

	headerStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(colorMauve).
			MarginBottom(1)

	selectedStyle = lipgloss.NewStyle().
			Background(colorSurface).
			Foreground(colorText).
			Bold(true).
			Padding(0, 1)

	normalStyle = lipgloss.NewStyle().
			Foreground(colorSubtext).
			Padding(0, 1)

	scoreHighStyle = lipgloss.NewStyle().Foreground(colorGreen).Bold(true)
	scoreMidStyle  = lipgloss.NewStyle().Foreground(colorYellow)
	scoreLowStyle  = lipgloss.NewStyle().Foreground(colorRed)

	statusStyle = map[string]lipgloss.Style{
		"Evaluated":   lipgloss.NewStyle().Foreground(colorBlue),
		"Shortlisted": lipgloss.NewStyle().Foreground(colorTeal),
		"Site Visit":  lipgloss.NewStyle().Foreground(colorMauve),
		"Negotiating": lipgloss.NewStyle().Foreground(colorPeach),
		"Offer Made":  lipgloss.NewStyle().Foreground(colorYellow),
		"Booked":      lipgloss.NewStyle().Foreground(colorGreen).Bold(true),
		"Registered":  lipgloss.NewStyle().Foreground(colorGreen).Bold(true),
		"Rejected":    lipgloss.NewStyle().Foreground(colorRed),
		"SKIP":        lipgloss.NewStyle().Foreground(colorOverlay),
		"Watching":    lipgloss.NewStyle().Foreground(colorSubtext),
	}

	tabActiveStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(colorBase).
			Background(colorMauve).
			Padding(0, 2)

	tabInactiveStyle = lipgloss.NewStyle().
				Foreground(colorSubtext).
				Background(colorSurface).
				Padding(0, 2)

	helpStyle = lipgloss.NewStyle().Foreground(colorOverlay)
)

// ─── Data Model ─────────────────────────────────────────────

type Property struct {
	Num      int
	Date     string
	Project  string
	Builder  string
	Location string
	Config   string
	Area     string
	Price    string
	PrSqft  string
	Score    float64
	ScoreStr string
	Status   string
	Report   string
	Notes    string
}

// ─── Filter Tabs ────────────────────────────────────────────

var tabs = []string{"All", "Shortlisted", "Active", "Top 7+", "Watching", "Passed"}

func filterProperties(properties []Property, tab string) []Property {
	if tab == "All" {
		return properties
	}

	var filtered []Property
	for _, p := range properties {
		switch tab {
		case "Shortlisted":
			if p.Status == "Shortlisted" {
				filtered = append(filtered, p)
			}
		case "Active":
			if p.Status == "Negotiating" || p.Status == "Site Visit" || p.Status == "Offer Made" {
				filtered = append(filtered, p)
			}
		case "Top 7+":
			if p.Score >= 7.0 {
				filtered = append(filtered, p)
			}
		case "Watching":
			if p.Status == "Watching" {
				filtered = append(filtered, p)
			}
		case "Passed":
			if p.Status == "Rejected" || p.Status == "SKIP" {
				filtered = append(filtered, p)
			}
		}
	}
	return filtered
}

// ─── Sort Modes ─────────────────────────────────────────────

var sortModes = []string{"Score", "Date", "Price", "Builder"}

func sortProperties(properties []Property, mode string) {
	switch mode {
	case "Score":
		sort.Slice(properties, func(i, j int) bool { return properties[i].Score > properties[j].Score })
	case "Date":
		sort.Slice(properties, func(i, j int) bool { return properties[i].Date > properties[j].Date })
	case "Price":
		sort.Slice(properties, func(i, j int) bool { return properties[i].Price < properties[j].Price })
	case "Builder":
		sort.Slice(properties, func(i, j int) bool { return properties[i].Builder < properties[j].Builder })
	}
}

// ─── Parse Tracker ──────────────────────────────────────────

func loadProperties(path string) []Property {
	file, err := os.Open(path)
	if err != nil {
		return nil
	}
	defer file.Close()

	var properties []Property
	scanner := bufio.NewScanner(file)

	lineNum := 0
	for scanner.Scan() {
		lineNum++
		line := strings.TrimSpace(scanner.Text())

		// Skip header, separator, title, empty
		if !strings.HasPrefix(line, "|") || lineNum <= 3 || strings.Contains(line, "---") {
			continue
		}

		cols := strings.Split(line, "|")
		// Trim empty first/last from pipe split
		var cleaned []string
		for _, c := range cols {
			t := strings.TrimSpace(c)
			if t != "" {
				cleaned = append(cleaned, t)
			}
		}

		if len(cleaned) < 13 {
			continue
		}

		num, _ := strconv.Atoi(cleaned[0])
		score, _ := strconv.ParseFloat(strings.Replace(cleaned[9], "/10", "", 1), 64)

		properties = append(properties, Property{
			Num:      num,
			Date:     cleaned[1],
			Project:  cleaned[2],
			Builder:  cleaned[3],
			Location: cleaned[4],
			Config:   cleaned[5],
			Area:     cleaned[6],
			Price:    cleaned[7],
			PrSqft:  cleaned[8],
			Score:    score,
			ScoreStr: cleaned[9],
			Status:   cleaned[10],
			Report:   cleaned[11],
			Notes:    cleaned[12],
		})
	}

	return properties
}

// ─── Bubble Tea Model ───────────────────────────────────────

type model struct {
	properties []Property
	filtered   []Property
	cursor     int
	activeTab  int
	sortMode   int
	width      int
	height     int
}

func initialModel() model {
	// Find properties.md
	trackerPath := filepath.Join("..", "data", "properties.md")
	if _, err := os.Stat(trackerPath); os.IsNotExist(err) {
		trackerPath = filepath.Join("data", "properties.md")
	}

	props := loadProperties(trackerPath)
	sortProperties(props, sortModes[0])

	return model{
		properties: props,
		filtered:   props,
		cursor:     0,
		activeTab:  0,
		sortMode:   0,
	}
}

func (m model) Init() tea.Cmd { return nil }

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height

	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit

		case "up", "k":
			if m.cursor > 0 {
				m.cursor--
			}

		case "down", "j":
			if m.cursor < len(m.filtered)-1 {
				m.cursor++
			}

		case "tab", "right", "l":
			m.activeTab = (m.activeTab + 1) % len(tabs)
			m.filtered = filterProperties(m.properties, tabs[m.activeTab])
			sortProperties(m.filtered, sortModes[m.sortMode])
			m.cursor = 0

		case "shift+tab", "left", "h":
			m.activeTab = (m.activeTab - 1 + len(tabs)) % len(tabs)
			m.filtered = filterProperties(m.properties, tabs[m.activeTab])
			sortProperties(m.filtered, sortModes[m.sortMode])
			m.cursor = 0

		case "s":
			m.sortMode = (m.sortMode + 1) % len(sortModes)
			sortProperties(m.filtered, sortModes[m.sortMode])

		case "home", "g":
			m.cursor = 0

		case "end", "G":
			if len(m.filtered) > 0 {
				m.cursor = len(m.filtered) - 1
			}
		}
	}

	return m, nil
}

func (m model) View() string {
	var b strings.Builder

	// Title
	b.WriteString(headerStyle.Render("PropOps Property Dashboard"))
	b.WriteString("\n")

	// Tabs
	var tabViews []string
	for i, t := range tabs {
		count := len(filterProperties(m.properties, t))
		label := fmt.Sprintf("%s (%d)", t, count)
		if i == m.activeTab {
			tabViews = append(tabViews, tabActiveStyle.Render(label))
		} else {
			tabViews = append(tabViews, tabInactiveStyle.Render(label))
		}
	}
	b.WriteString(lipgloss.JoinHorizontal(lipgloss.Top, tabViews...))
	b.WriteString("\n")

	// Sort indicator
	b.WriteString(helpStyle.Render(fmt.Sprintf("Sort: %s  |  %d properties", sortModes[m.sortMode], len(m.filtered))))
	b.WriteString("\n\n")

	// Property list
	if len(m.filtered) == 0 {
		b.WriteString(normalStyle.Render("No properties in this view."))
	} else {
		maxVisible := m.height - 10
		if maxVisible < 5 {
			maxVisible = 15
		}

		start := 0
		if m.cursor >= maxVisible {
			start = m.cursor - maxVisible + 1
		}

		for i := start; i < len(m.filtered) && i < start+maxVisible; i++ {
			p := m.filtered[i]

			// Score coloring
			var scoreView string
			if p.Score >= 8.0 {
				scoreView = scoreHighStyle.Render(p.ScoreStr)
			} else if p.Score >= 6.0 {
				scoreView = scoreMidStyle.Render(p.ScoreStr)
			} else {
				scoreView = scoreLowStyle.Render(p.ScoreStr)
			}

			// Status coloring
			stStyle, ok := statusStyle[p.Status]
			if !ok {
				stStyle = normalStyle
			}
			statusView := stStyle.Render(p.Status)

			line := fmt.Sprintf("#%-3d %s  %-28s %-18s %-10s %-8s %s",
				p.Num, scoreView, truncate(p.Project, 28), truncate(p.Builder, 18),
				p.Price, p.Config, statusView)

			if i == m.cursor {
				b.WriteString(selectedStyle.Render("▸ " + line))
			} else {
				b.WriteString(normalStyle.Render("  " + line))
			}
			b.WriteString("\n")
		}
	}

	// Selected property detail
	if m.cursor >= 0 && m.cursor < len(m.filtered) {
		p := m.filtered[m.cursor]
		b.WriteString("\n")
		detail := fmt.Sprintf("📍 %s | 📐 %s sqft | Rs %s/sqft | %s",
			p.Location, p.Area, p.PrSqft, p.Notes)
		b.WriteString(lipgloss.NewStyle().Foreground(colorTeal).Render(detail))
	}

	// Help
	b.WriteString("\n\n")
	b.WriteString(helpStyle.Render("↑↓/jk navigate  ←→/hl tabs  s sort  q quit"))

	return b.String()
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s + strings.Repeat(" ", max-len(s))
	}
	return s[:max-1] + "…"
}

// ─── Main ───────────────────────────────────────────────────

func main() {
	p := tea.NewProgram(initialModel(), tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
