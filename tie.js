/*
 * contains definitions of Part and TIE classes
 *
 */


// goofy stuff becuase i'm not using an actual tree

var Part = function(tie, specs, id, parent_id, parent_link) {
	this.id = id;
	this.type = specs.type;
	this.links = [];

	// for each link on the new part
	for (var i = specs.n_links - 1; i >= 0; i--) {

		// link is inactive by default
		var link_to = -1;

		if (this.type !== "WING") {
			// if the link is opposite the parent link, link back
			if ((this.type !== "CORE") && i == parent_link) {
				link_to = parent_id;
			} else {
				// otherwise, decide if the link should be active
				// roll the dice
				if (Math.random() < tie.p_active) {
					// active, decide types
					var new_type;
					if (Math.random() < tie.p_wing) {
						new_type = "WING";
					} else {
						new_type = "TUBE";
					}
					// point the link to the new part's id
					link_to = tie.usePartID();
					// create the new part
					tie.addPart(new Part(tie, tie.part_specs[new_type], link_to, id, (i + specs.n_links/2) % specs.n_links));
				}
			}
		}
		this.links.push(link_to);
	}
}

var TIE = function() {

	// this is basically a static value, sorry mom
	// should be in a factory object (or really, nowhere, because this should be a tree)
	this.nextPartID = 0;

	// ideally the part types would be an enum
	this.part_specs = {
		"CORE": {
			"type": "CORE",
			"n_links": 6
		},
		"TUBE": {
			"type": "TUBE",
			"n_links": 6
		},
		"WING": {
			"type": "WING",
			"n_sides": 3,
			"n_links": 1
		},
		"JOINT": {
			"width": 2 // maybe these can be adaptive width to avoid clipping
		}
	};
	this.parts = [];
	this.p_active = 0.3;
	this.p_wing = 0.75;
};
TIE.prototype.addPart = function(part) {
	this.parts.push(part);
}
TIE.prototype.getParts = function(part) {
	return this.parts;
}
TIE.prototype.usePartID = function() {
	this.nextPartID++;
	return this.nextPartID;
}
TIE.prototype.generate = function() {
	// add the root node
	// recursively add parts until each active link is inactive or ends in a wing
	this.addPart(new Part(this, this.part_specs["CORE"], 0, -1, -1));
}
TIE.prototype.draw = function() {
	if (this.nextPartID === 0) return;
}

