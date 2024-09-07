class PdbDisplay {
    constructor(container_id, filename_element_id, interactive = true) {
        console.log("interactive", interactive);
        var colors = {
            "tp": "#4eed5e",
            "fp": "#ed4e51",
            //"fp": "#4eed5e",
            "fn": "#e0b048",
            "tp2": "#4eed5e",
            "fp2": "#ed4e51",
            "fn2": "#e0b048",
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
        this.visibility_map = {
            "struct-af3": true,
            "struct-real": true,
            "pred-af3": true,
            "pred-pio": true,
        };

        this.structures = {
            "af3": undefined,
            "real": undefined,
        };

        this.predictions = {
            "pio": [],
            "af3": [],
        };

        if (interactive) {
            this.toggle_struct_af3 = document.getElementById(`${container_id}-toggle-struct-af3`);
            this.toggle_struct_real = document.getElementById(`${container_id}-toggle-struct-real`);
            this.toggle_pred_af3 = document.getElementById(`${container_id}-toggle-pred-af3`);
            this.toggle_pred_pio = document.getElementById(`${container_id}-toggle-pred-pio`);
            this.make_image = document.getElementById(`${container_id}-make-image`);

            this.toggle_pred_af3.addEventListener("click", () => { this.togglePrediction("af3"); });
            this.toggle_pred_pio.addEventListener("click", () => { this.togglePrediction("pio"); });
            this.toggle_struct_af3.addEventListener("click", () => { this.toggleComponent("af3"); });
            this.toggle_struct_real.addEventListener("click", () => { this.toggleComponent("real"); });
            this.make_image.addEventListener("click", () => { this.createFile(); });
        }

        this.stage = new NGL.Stage(container_id);
        //this.stage.spinAnimation = this.stage.animationControls.spin([0, 1, 0], 0.005);
        this.stage.setParameters({
            backgroundColor: "rgba(133, 133, 133, 1)",
        });
        const filename_holder = document.getElementById(filename_element_id);
        const filename = JSON.parse(filename_holder.getAttribute('data-filename'));
        console.log("stage", this.stage);
        var self = this;
        this.stage.loadFile(`/pdb/${filename}`)
            .then(function(component) {
                if (component === undefined) return;
                if (component.type !== "structure") return;

                console.log(self);
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
                self.stage.autoView();
            });
    }
    togglePrediction(method, full = false) {
        let vis_k = `pred-${method}`
        this.visibility_map[vis_k] = !this.visibility_map[vis_k];
        for (const pred of this.predictions[method]) {
            pred.setVisibility(this.visibility_map[vis_k]);
        }
    }

    toggleComponent(method, full = false) {
        let vis_k = `struct-${method}`
        this.visibility_map[vis_k] = !this.visibility_map[vis_k];
        this.structures[method].setVisibility(this.visibility_map[vis_k]);
    }

    createFile() {
        console.log(this.stage);
        this.stage.viewer.makeImage({ "factor": 2 })
            .then((blob) => {
                const fileUrl = window.URL.createObjectURL(blob);
                const anchorElement = document.createElement('a');

                anchorElement.href = fileUrl;
                anchorElement.download = 'image.jpg';
                anchorElement.style.display = 'none';

                document.body.appendChild(anchorElement);

                anchorElement.click();
                anchorElement.remove();

                window.URL.revokeObjectURL(fileUrl);
            });
    }
}


