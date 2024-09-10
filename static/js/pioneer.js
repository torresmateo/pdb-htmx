class PdbDisplay {

    constructor(viewport_id, prediction_metadata, pdb_filename, display_config, interactive = true) {
        this.prediction_meta = prediction_metadata;
        this.visibility_map = {
            "af3": display_config.ShowAF3,
            "real": display_config.ShowReal,
            "real-af3": display_config.ShowPredAF3,
            "real-pio": display_config.ShowPredPIO,
            "af3-af3": display_config.ShowAnnotAF3,
            "af3-pio": display_config.ShowAnnotPIO,
        };

        this.structures = {
            "af3": undefined,
            "real": undefined,
        };

        // real-af3 means structure: real and prediction: af3
        this.predictions = {
            "real-af3": [],
            "real-pio": [],
            "af3-af3": [],
            "af3-pio": [],
        };

        // other PdbDisplays that would ideally share the position of this one.
        this.mirrors = [];

        if (interactive) {
            this.toggle_real = document.getElementById(`${viewport_id}-toggle-struct-real`);
            this.toggle_real_af3 = document.getElementById(`${viewport_id}-toggle-struct-real-pred-af3`);
            this.toggle_real_pio = document.getElementById(`${viewport_id}-toggle-struct-real-pred-pio`);
            this.toggle_af3 = document.getElementById(`${viewport_id}-toggle-struct-af3`);
            this.toggle_af3_af3 = document.getElementById(`${viewport_id}-toggle-struct-af3-pred-af3`);
            this.toggle_af3_pio = document.getElementById(`${viewport_id}-toggle-struct-af3-pred-pio`);
            this.make_image = document.getElementById(`${viewport_id}-make-image`);
            this.set_mirrors = document.getElementById(`${viewport_id}-set-mirrors`);

            this.toggle_real.addEventListener("click", () => {
                this.toggleStructureCheckbox("real", this.toggle_real, this.toggle_real_af3, this.toggle_real_pio);
            });
            this.toggle_real_af3.addEventListener("click", () => { this.togglePrediction("real-af3"); });
            this.toggle_real_pio.addEventListener("click", () => { this.togglePrediction("real-pio"); });

            this.toggle_af3.addEventListener("click", () => {
                this.toggleStructureCheckbox("af3", this.toggle_af3, this.toggle_af3_af3, this.toggle_af3_pio);
            });
            this.toggle_af3_af3.addEventListener("click", () => { this.togglePrediction("af3-af3"); });
            this.toggle_af3_pio.addEventListener("click", () => { this.togglePrediction("af3-pio"); });
            this.make_image.addEventListener("click", () => { this.createFile(); });
            this.set_mirrors.addEventListener("click", () => { this.setMirrors(); });
        }
        this.stage = new NGL.Stage(viewport_id);
        //this.stage.spinAnimation = this.stage.animationControls.spin([0, 1, 0], 0.005);
        this.stage.setParameters({
            //backgroundColor: "rgba(133, 133, 133, 1)",
            backgroundColor: "rgba(255, 255, 255, 0)",
        });

        this.image_basename = pdb_filename.split(".")[0];

        this.render(pdb_filename);
    }

    static async init(viewport_id, interactive = true) {
        const pdb_data_id = `${viewport_id}-info`;
        const pdb_info_el = document.getElementById(pdb_data_id);
        const display_config = JSON.parse(pdb_info_el.getAttribute('data-display'));
        const filename = JSON.parse(pdb_info_el.getAttribute('data-filename'));
        const metadata_filename = JSON.parse(pdb_info_el.getAttribute('data-metadata'));
        const response = await fetch(`/predmeta/${metadata_filename}`);
        const metadata = await response.json();
        return new PdbDisplay(viewport_id, metadata, filename, display_config, interactive);
    }

    render(filename) {
        var colors = {
            "tp": "#4eed5e",
            "fp": "#ed4e51",
            //"fp": "#4eed5e",
            "fn": "#e0b048",
            "tp2": "#4eed5e",
            "fp2": "#ed4e51",
            "fn2": "#e0b048",
            "neutral-prediction": "steelblue",
            "target_chain": "#F8981D",
            "partner_chain": "#006699",
            "target_chain_af3": "#6EB43F",
            "partner_chain_af3": "#EF4035",
        }
        var real_color = NGL.ColormakerRegistry.addSelectionScheme([
            // these are the colors for the pioneer1 paper
            //["blue", interaction_information[current_interaction]["target_chain"]],
            //["cornflowerblue", interaction_information[current_interaction]["partner_chain"]],

            // these are colors for the pioneer2 poster
            [colors["target_chain_af3"], `:A`],
            [colors["partner_chain_af3"], `:B`],
            // these are colors for the pioneer2 poster
            [colors["target_chain"], `:T`],
            [colors["partner_chain"], `:P`],
        ], "real");
        var self = this;
        // TODO(mateo): make naming more consistent to avoid the need for this map
        const method_map = {
            "PIONEER2.0": "pio",
            "AF3": "af3",
        }
        this.stage.loadFile(`/pdb/${filename}`)
            .then(function(component) {
                if (component === undefined) return;
                if (component.type !== "structure") return;

                self.structures["real"] = component.addRepresentation("cartoon", {
                    sele: "polymer and :T or :P",
                    opacity: 1,
                    surfaceType: "sas",
                    contour: true,
                    colorScheme: real_color,
                    probeRadius: 1.2,
                });
                self.structures["af3"] = component.addRepresentation("cartoon", {
                    sele: "polymer and :A or :B",
                    opacity: 1,
                    surfaceType: "sas",
                    contour: true,
                    colorScheme: real_color,
                    probeRadius: 1.2,
                });
                // predictions on the real structure
                for (const group of ["target", "partner"]) {
                    for (const outcome of ["tp", "fp"]) {
                        for (const method of ["AF3", "PIONEER2.0"]) {
                            let mkey = `real-${method_map[method]}`;
                            let selection_string = self.prediction_meta[method][group][outcome];
                            if (selection_string != "none") {
                                self.predictions[mkey].push(component.addRepresentation("spacefill", {
                                    sele: selection_string,
                                    color: colors[outcome],
                                }));
                            }
                        }
                    }
                }
                // predictions on the AF3 structure
                for (const group of ["target-af3", "partner-af3"]) {
                    for (const outcome of ["tp", "fp"]) {
                        for (const method of ["AF3", "PIONEER2.0"]) {
                            let mkey = `af3-${method_map[method]}`;
                            let selection_string = self.prediction_meta[method][group][outcome];
                            if (selection_string != "none") {
                                self.predictions[mkey].push(component.addRepresentation("spacefill", {
                                    sele: selection_string,
                                    color: colors["neutral-prediction"],
                                }));
                            }
                        }
                    }
                }
                //set visibilities for all structures 
                for (const key in self.structures) {
                    self.structures[key].setVisibility(self.visibility_map[key]);
                }
                //set visibilities for all predictions 
                for (const key in self.predictions) {
                    for (const pred of self.predictions[key]) {
                        pred.setVisibility(self.visibility_map[key]);
                    }
                }
                self.stage.autoView();
            });
    }

    togglePrediction(key) {
        this.visibility_map[key] = !this.visibility_map[key];
        for (const pred of this.predictions[key]) {
            pred.setVisibility(this.visibility_map[key]);
        }
    }

    toggleComponent(method) {
        let vis_k = `${method}`
        this.visibility_map[vis_k] = !this.visibility_map[vis_k];
        this.structures[method].setVisibility(this.visibility_map[vis_k]);
    }

    toggleStructureCheckbox(structure_key, structure_checkbox, af3_checkbox, pio_checkbox) {
        this.toggleComponent(structure_key);
        let struct_visible = structure_checkbox.checked;
        if (!struct_visible) {
            if (af3_checkbox.checked)
                af3_checkbox.click();
            if (pio_checkbox.checked)
                pio_checkbox.click();
            af3_checkbox.disabled = true;
            pio_checkbox.disabled = true;
        } else {
            if (af3_checkbox.checked)
                af3_checkbox.click();
            if (pio_checkbox.checked)
                pio_checkbox.click();
            af3_checkbox.disabled = false;
            pio_checkbox.disabled = false;
        }
    }

    prepareImageName() {
        console.log("visibility map", this.visibility_map);
        let struct = "none";
        if (this.visibility_map["af3"] && this.visibility_map["struct-real"]) {
            struct = "aligned";
        } else if (this.visibility_map["af3"]) {
            struct = "af3";
        } else if (this.visibility_map["real"]) {
            struct = "real";
        }

        let pred = "-none";
        if (this.visibility_map["real-af3"] && this.visibility_map["real-pio"]) {
            pred = "-both";
        } else if (this.visibility_map["real-af3"]) {
            pred = "-af3";
        } else if (this.visibility_map["real-pio"]) {
            pred = "-pio";
        }

        let annot = "-none";
        if (this.visibility_map["af3-af3"] && this.visibility_map["af3-pio"]) {
            annot = "-a_both";
        } else if (this.visibility_map["af3-af3"]) {
            annot = "-a_af3";
        } else if (this.visibility_map["af3-pio"]) {
            annot = "-a_pio";
        }
        const fname = `${this.image_basename}-${struct}${pred}${annot}.jpg`
        return fname;
    }

    createFile() {
        this.stage.viewer.makeImage({ "factor": 2, "transparent": true })
            .then((blob) => {
                const fileUrl = window.URL.createObjectURL(blob);
                const anchorElement = document.createElement('a');

                anchorElement.href = fileUrl;
                anchorElement.download = this.prepareImageName();
                anchorElement.style.display = 'none';

                document.body.appendChild(anchorElement);

                anchorElement.click();
                anchorElement.remove();

                window.URL.revokeObjectURL(fileUrl);
            });
    }

    addMirror(mirror) {
        this.mirrors.push(mirror);
    }

    setMirrors() {
        var orientationMatrix = this.stage.viewerControls.getOrientation();
        console.log("om", orientationMatrix);
        console.log(this.mirrors);
        for (const mirror of this.mirrors) {
            mirror.stage.viewerControls.orient(orientationMatrix);
        }
    }
}


