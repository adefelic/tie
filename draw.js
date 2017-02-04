// draw.js
//
// hic sunt memory leaks, ignoring for now
//
// inspiration, theft from:
//   https://dev.opera.com/articles/raw-webgl-part-2-simple-shader/webgl-utils.js
//   https://developer.mozilla.org/en-US/docs/Web/WebGL
//   http://learningwebgl.com/
//

// application variables
var gl;                       // webGL drawing context
var mvMatrix;                 // model-view matrix
var mvMatrixStack;            // so we can push and pop
var pMatrix;                  // projection matrix
var shaderProgram;            // shader program
var lastTime = 0;             // last time the animation updated

var nodeRotX;
var nodeScale;

/**
 * Node class
 *
 * represents a node on the scene graph
 *
 *
 */
var Node = function(vertices, indices, colors) {

	/* set up vertex positions */
	this.vertexPositionBuffer = gl.createBuffer();
	this.vertexPositionBuffer.itemSize = 3; // 3 values per vertex
	this.vertexPositionBuffer.numItems = vertices.length / this.vertexPositionBuffer.itemSize;
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	/* set up vertex indices */
	this.vertexIndexBuffer = gl.createBuffer();
	this.vertexIndexBuffer.itemSize = 1;
	this.vertexIndexBuffer.numItems = indices.length / this.vertexIndexBuffer.itemSize;
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

	/* set up vertex colors */
	this.vertexColorBuffer = gl.createBuffer();
	this.vertexColorBuffer.numItems = 4;
	this.vertexColorBuffer.itemSize = colors.length / this.vertexColorBuffer.itemSize;
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexColorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
};

function initGL(canvas) {
	gl = null;
	try {
		gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
		gl.viewportWidth  = canvas.width;
		gl.viewportHeight = canvas.height;
	}
	catch(e) {
		console.error("Couldn't init WebGL, use a newer browser");
		gl = null;
	}
}

// stole this from learningwebgl.com/lessons/lesson01/index.html
function getShader(id) {
	var shaderScript = document.getElementById(id);
	if (!shaderScript) {
		return null;
	}

	var str = "";
	var k = shaderScript.firstChild;
	while (k) {
		if (k.nodeType == 3) {
			str += k.textContent;
		}
		k = k.nextSibling;
	}

	var shader;
	if (shaderScript.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}

	gl.shaderSource(shader, str);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}

// shader code needs to be refactored
function initShaders() {

	// init model-view and projection matrices
	mvMatrix = mat4.create();
	pMatrix  = mat4.create();
	mvMatrixStack = [];

	// create the shader program
	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, getShader("shader-fs"));
	gl.attachShader(shaderProgram, getShader("shader-vs"));
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		throw gl.getProgramInfoLog(shaderProgram);
	}

	// use shader program
	gl.useProgram(shaderProgram);

	// store some shader hooks
	// vertex positions !
	shaderProgram.vertexPosAttrib = gl.getAttribLocation(shaderProgram, 'aVertexPos');
	gl.enableVertexAttribArray(shaderProgram.vertexPosAttrib);

	// vertex colors !
	shaderProgram.vertexColorAttrib = gl.getAttribLocation(shaderProgram, 'aVertexColor');
	gl.enableVertexAttribArray(shaderProgram.vertexColorAttrib);

	// set perspective and modelview matrices
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, 'uPMatrix');
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, 'uMVMatrix');
}

function mvPushMatrix() {
	var copy = mat4.create();
	mat4.set(mvMatrix, copy);
	mvMatrixStack.push(copy);
}

function mvPopMatrix() {
	if (mvMatrixStack.length == 0) {
		throw "Invalid popMatrix!";
	}
	mvMatrix = mvMatrixStack.pop();
}

// pushes changes to projection and model-view matrices to the gpu
function setMatrixUniforms() {
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

function drawScene(nodes) {
	// this'll probably be in callbacks later
	for (var i = nodes.length - 1; i >= 0; i--) {
		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
		gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
		mat4.perspective(45, gl.viewportWidth/gl.viewportHeight, 0.1, 100.0, pMatrix);

		mat4.identity(mvMatrix);
		mat4.translate(mvMatrix, [0.0, 0.0, -8.0]);

		mvPushMatrix();
			// let's roll
			mat4.rotate(mvMatrix, nodeRotX, [1, 1, 0]);
			// bounce
			mat4.scale(mvMatrix, [nodeScale, nodeScale, nodeScale]);
			// position those vertices
			gl.bindBuffer(gl.ARRAY_BUFFER, nodes[i].vertexPositionBuffer);
			gl.vertexAttribPointer(shaderProgram.vertexPosAttrib, 3, gl.FLOAT, false, 0, 0);
			// shade 'em too
			gl.bindBuffer(gl.ARRAY_BUFFER, nodes[i].vertexColorBuffer);
			gl.vertexAttribPointer(shaderProgram.vertexColorAttrib, 4, gl.FLOAT, false, 0, 0);
			// texture

			// element array
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, nodes[i].vertexIndexBuffer);
			// push to gpu
			setMatrixUniforms();
			// draw
			gl.drawElements(gl.TRIANGLES, nodes[i].vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
		mvPopMatrix();
	}
}

function handleLoadedTexture(texture) {
	gl.bindTexture(gl.TEXTURE_2D, texture);
	// investigate this call
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.bindTexture(gl.TEXTURE_2D, null); // cleanup
}

// latency cleverness from http://learningwebgl.com/blog/?p=239
function animate() {
	var timeNow = new Date().getTime();
	if (lastTime != 0) {
		var elapsed = timeNow - lastTime;
		nodeRotX += (Math.PI/2 * elapsed / 1000.0); // this will overflow eventually
		nodeRotX %= Math.PI*2;
		nodeScale = (Math.sin(nodeRotX) + 3) / 3;
	}
	lastTime = timeNow;
}

function tick(nodes) {
	requestAnimFrame(function(){tick(nodes)}); // thanks for the function, google
	drawScene(nodes);
	animate();
}

function startGL() {
	var canvas = document.getElementById("gl1");
	initGL(canvas);

	// generate a tie
	var t = new TIE();
	t.generate();
	p = t.getParts();
	console.log(JSON.stringify(p, null, 4));

	// make the cube
	var cube = new Node(cube_geometry["vertices"], cube_geometry["indices"], cube_geometry["colors"]);
	initShaders();
	gl.clearColor(0.0, 0.0, 0.0, 1.0); // black
	gl.enable(gl.DEPTH_TEST);

	nodeRotX = 0.0;
	nodeScale = 1.0;


	tick([cube]);
}
