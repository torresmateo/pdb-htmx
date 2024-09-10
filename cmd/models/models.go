package models

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/a-h/templ"
)

type Pdb struct {
	PdbId          string
	AlignedProtein string
	Filename       string
}

func newPdb(pdb, aligned_protein, filename string) *Pdb {
	return &Pdb{
		PdbId:          pdb,
		AlignedProtein: aligned_protein,
		Filename:       filename,
	}
}

func (p *Pdb) URL(i *Interaction) templ.SafeURL {
	return templ.SafeURL("/pdb/" + i.P1 + "_" + i.P2 + "/" + p.PdbId + "/" + p.AlignedProtein)
}
func (p *Pdb) PairURL(i *Interaction) templ.SafeURL {
	return templ.SafeURL("/pdbpair/" + i.P1 + "_" + i.P2 + "/" + p.PdbId)
}

func (p *Pdb) PresentationURL(i *Interaction) templ.SafeURL {
	return templ.SafeURL("/pdbpresentation/" + i.P1 + "_" + i.P2 + "/" + p.PdbId + "/" + p.AlignedProtein)
}

func (p *Pdb) MetadataFilename(i *Interaction) string {
	return i.P1 + "_" + i.P2 + "_" + p.PdbId + ".json"
}

type Interaction struct {
	P1   string
	P2   string
	Pdbs []*Pdb
}

func (i *Interaction) AssociatedPdbs() string {
	return strconv.Itoa(len(i.Pdbs))
}
func (i *Interaction) URL() templ.SafeURL {
	return templ.SafeURL("/interaction/" + i.P1 + "_" + i.P2)
}

func (i *Interaction) UniquePdbs() []*Pdb {
	result := []*Pdb{}
	for _, pdb := range i.Pdbs {
		if pdb.AlignedProtein == i.P1 {
			result = append(result, pdb)
		}
	}
	return result
}

func newInteraction(p1, p2, pdb, aligned_protein, filename string) *Interaction {
	i := &Interaction{
		P1:   p1,
		P2:   p2,
		Pdbs: []*Pdb{},
	}
	i.Pdbs = append(i.Pdbs, newPdb(pdb, aligned_protein, filename))
	return i
}

func InitInteractions(path string, interactions map[string]*Interaction) {
	files, err := os.ReadDir(path)
	if err != nil {
		log.Fatal(err)
	}
	for _, file := range files {
		//fmt.Print(file.Name())
		parts := strings.Split(file.Name(), "_")
		if len(parts) == 4 {
			key := parts[0] + "_" + parts[1]
			aligned_protein := strings.Split(parts[3], ".")[0]
			if interaction, ok := interactions[key]; ok {
				//add new data
				interaction.Pdbs = append(interaction.Pdbs, newPdb(parts[2], aligned_protein, file.Name()))
			} else {
				interactions[key] = newInteraction(parts[0], parts[1], parts[2], aligned_protein, file.Name())
			}
		}
	}
	fmt.Println("loaded ", len(interactions), " interactions")
}
