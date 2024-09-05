package main

import (
	"fmt"
	"net/http"

	"github.com/a-h/templ"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"mateo/pdb/cmd/models"
	"mateo/pdb/components"
)

var interactions map[string]*models.Interaction

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
	models.InitInteractions("./pdb", interactions)
	displayInteractionsStats()
	e := echo.New()
	e.Static("/pdb", "pdb")
	e.Static("/css", "static/css")
	e.Static("/js", "static/js")
	e.Use(middleware.Logger())
	e.GET("/", HomeHandler)
	e.GET("/interaction/:interaction_id", InteractionHandler)
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
	return Render(c, http.StatusOK, components.Home(interactions))
}

func InteractionHandler(c echo.Context) error {
	interactionStr := c.Param("interaction_id")
	if interaction, ok := interactions[interactionStr]; ok {
		return Render(c, http.StatusOK, components.Interaction(interaction, interactions))
	}
	return c.String(404, "Interaction not found")

}
