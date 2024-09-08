package main

import (
	"fmt"
	"log"
	"net/http"
	"sort"
	"strings"

	"github.com/a-h/templ"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"mateo/pdb/cmd/models"
	"mateo/pdb/components"
)

type interactionSlice []*models.Interaction

func (is interactionSlice) Len() int {
	return len(is)
}
func (is interactionSlice) Swap(i, j int) {
	is[i], is[j] = is[j], is[i]
}
func (is interactionSlice) Less(i, j int) bool {
	if len(is[i].Pdbs) < len(is[j].Pdbs) {
		return true
	} else if len(is[i].Pdbs) == len(is[j].Pdbs) {
		p1cmp := strings.Compare(is[i].P1, is[j].P1)
		if p1cmp == -1 {
			return true
		} else if p1cmp == 0 {
			if strings.Compare(is[i].P2, is[j].P2) == -1 {
				return true
			}
		}
	}
	return false
}

var interactions map[string]*models.Interaction
var sortedInteractions interactionSlice

func displayInteractionsStats() {
	fmt.Println("stats")
	pdb_counts := make(map[int]int)
	for _, interaction := range interactions {
		qty := len(interaction.Pdbs)
		if _, ok := pdb_counts[qty]; !ok {
			pdb_counts[qty] = 0
		}
		pdb_counts[qty]++
	}
	for k, v := range pdb_counts {
		fmt.Println(k, v)
	}
}

func main() {
	interactions = make(map[string]*models.Interaction)
	models.InitInteractions("./static/pdb", interactions)
	sortedInteractions = make(interactionSlice, 0, len(interactions))
	for _, i := range interactions {
		sortedInteractions = append(sortedInteractions, i)
	}
	sort.Sort(sortedInteractions)
	displayInteractionsStats()
	e := echo.New()
	e.Static("/pdb", "static/pdb")
	e.Static("/predmeta", "static/prediction-metadata")
	e.Static("/css", "static/css")
	e.Static("/js", "static/js")
	e.Use(middleware.Logger())
	e.GET("/", HomeHandler)
	e.GET("/about/", AboutHandler)
	e.GET("/interaction/:interaction_id", InteractionHandler)
	e.GET("/pdb/:interaction_id/:pdb_id/:aligned_partner", PdbHandler)
	e.GET("/pdbpair/:interaction_id/:pdb_id", PdbPairHandler)
	e.Logger.Fatal(e.Start(":1323"))
}

// This custom Render replaces Echo's echo.Context.Render() with templ's templ.Component.Render().
func Render(ctx echo.Context, statusCode int, t templ.Component) error {
	buf := templ.GetBuffer()
	defer templ.ReleaseBuffer(buf)

	if err := t.Render(ctx.Request().Context(), buf); err != nil {
		return err
	}

	return ctx.HTML(statusCode, buf.String())
}

func HomeHandler(c echo.Context) error {
	return Render(c, http.StatusOK, components.Home(sortedInteractions))
}

func AboutHandler(c echo.Context) error {
	return Render(c, http.StatusOK, components.About())
}

func InteractionHandler(c echo.Context) error {
	interactionStr := c.Param("interaction_id")
	if interaction, ok := interactions[interactionStr]; ok {
		return Render(c, http.StatusOK, components.Interaction(interaction, sortedInteractions))
	}
	return c.String(404, "Interaction not found")
}

func PdbHandler(c echo.Context) error {
	interactionId := c.Param("interaction_id")
	pdbId := c.Param("pdb_id")
	alignedPartner := c.Param("aligned_partner")
	log.Println("interactionId", interactionId)
	log.Println("pdbId", pdbId)
	log.Println("alignedPartner", alignedPartner)
	if interaction, ok := interactions[interactionId]; ok {
		for _, pdb := range interaction.Pdbs {
			if pdb.PdbId == pdbId && pdb.AlignedProtein == alignedPartner {
				return Render(c, http.StatusOK, components.Pdb(interaction, pdb, sortedInteractions))
			}
		}
		return c.String(404, "PDB entry not found")
	}
	return c.String(404, "Interaction not found")

}

func PdbPairHandler(c echo.Context) error {
	interactionId := c.Param("interaction_id")
	pdbId := c.Param("pdb_id")
	log.Println("interactionId", interactionId)
	log.Println("pdbId", pdbId)
	var pdbs []*models.Pdb
	current_pdb := 0
	if interaction, ok := interactions[interactionId]; ok {
		for _, pdb := range interaction.Pdbs {
			if pdb.PdbId == pdbId {
				pdbs = append(pdbs, pdb)
				current_pdb++
			}
		}
		if current_pdb == 2 {
			return Render(c, http.StatusOK, components.PdbPair(interaction, pdbs[0], pdbs[1], sortedInteractions))
		}
		return c.String(404, "PDB entry not found")
	}
	return c.String(404, "Interaction not found")

}
