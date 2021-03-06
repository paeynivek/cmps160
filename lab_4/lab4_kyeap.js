// Kevin Yeap
// kyeap@ucsc.edu
// 1270597
// A.Pang S15
//shark

//Left click the shark to toggle between flat and smooth shading. 
//Right click the shark to toggle between perspective and orthographic view.

//AMOUNT IN DEGREES TO ROTATE MODEL
x = 0;
y = -60;
z = -10;

var gl, vbuf;

var shader_flag = 0;
var perspective_flag = 0;

var point_array = [];
var normal_array = [];
var smooth_shading_array = [];
var flat_shading_array = [];

var x_theta = x * Math.PI / 180;
var x1 = Math.cos(x_theta);
var x2 = -Math.sin(x_theta);
var x3 = Math.sin(x_theta);
var x4 = Math.cos(x_theta);

var x_rotation_matrix = 
[ 1, 0, 0, 0,
  0, x1, x2, 0,
  0, x3, x4, 0,
  0, 0, 0, 1
];

var y_theta = y * Math.PI / 180;
var y1 = Math.cos(y_theta);
var y2 = Math.sin(y_theta);
var y3 = -Math.sin(y_theta);
var y4 = Math.cos(y_theta);

var y_rotation_matrix = 
[ y1, 0, y2, 0,
  0, 1, 0, 0,
  y3, 0, y4, 0,
  0, 0, 0, 1
];

var z_theta = z * Math.PI / 180;
var z1 = Math.cos(z_theta);
var z2 = -Math.sin(z_theta);
var z3 = Math.sin(z_theta);
var z4 = Math.cos(z_theta);

var z_rotation_matrix = 
[ z1, z2, 0, 0,
  z3, z4, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1
];

var s = 120;
var zoom_matrix = 
[ 1 / s, 0, 0, 0,
  0, 1 / s, 0, 0,
  0, 0, 1 / s, 0,
  0, 0, 0, 1
];

var fovy = 200.0; // Field-of-view in Y direction angle (in degrees)
var aspect = 640 / 480; // Viewport aspect ratio
var near = 0.3;
var far = 100.0;

//background color
var R = 0;
var G = 191;
var B = 255;
var A = 255;

function init() {
  //gl.clearColor(0.0, .75, 1.0, 1); //preset value of background color to deep sky blue; RGBA
  gl.clearColor(R / 255, G / 255, B / 255, A / 255);
  gl.clear(gl.COLOR_BUFFER_BIT); //clearing the color buffer to the preset colors
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.GREATER);
  gl.clearDepth(0.0);

  aspect = canvas.width / canvas.height;

  var lightPosition = vec4(1.0, 1.0, 1.0, 0.0);
  var lightAmbient = vec4(0.12, 0.12, 0.12, 1.0);
  var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
  var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

  var materialAmbient = vec4(1.0, 1.0, 1.0, 1.0);
  var materialDiffuse = vec4(0.55, 0.55, 0.55, 1.0);
  var materialSpecular = vec4(.5, .5, .5, 1.0);
  var materialShininess = 10;

  ambientProduct = mult(lightAmbient, materialAmbient);
  console.log(flatten(ambientProduct));
  diffuseProduct = mult(lightDiffuse, materialDiffuse);
  specularProduct = mult(lightSpecular, materialSpecular);

  gl.uniform4fv(gl.getUniformLocation(shaderProgram, "ambientProduct"), flatten(ambientProduct));
  gl.uniform4fv(gl.getUniformLocation(shaderProgram, "diffuseProduct"), flatten(diffuseProduct));
  gl.uniform4fv(gl.getUniformLocation(shaderProgram, "specularProduct"), flatten(specularProduct));
  gl.uniform4fv(gl.getUniformLocation(shaderProgram, "lightPosition"), flatten(lightPosition));
  gl.uniform1f(gl.getUniformLocation(shaderProgram, "shininess"), materialShininess);
}

function setup() {
  var canvas = document.getElementById("canvas");
  canvas.width = 640;
  canvas.height = 480;

  try { //setup gl context
    gl = canvas.getContext("experimental-webgl");
    gl.viewportWidth = canvas.width; //set viewport width to canvas width
    gl.viewportHeight = canvas.height; //set viewport height to canvas height 
    initShaders(); //initialize shaders
    init(); //initialize the canvas and the grid overlay for point plotting
  } catch (e) {}

  if (!gl) {
    alert("Unable to initialize WebGL.");
  } else {

    generate_shark();
    var arraysize = canvas.width * canvas.height * 4;
    var pixelData = new Uint8Array(arraysize)
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
    //var colorData = new Uint32Array ( pixelData.buffer);

    document.getElementById('canvas').addEventListener('mousedown', function(evt) {
      var mousePos = getMousePos(canvas, evt);
      var index = (mousePos.y - 1) * canvas.width + mousePos.x; //2d to 1d conversion

      switch (event.which) {
        case 1: //left-click
          if (pixelData[index * 4] != R | pixelData[index * 4 + 1] != G | pixelData[index * 4 + 2] != B) {
            shader_flag++;
            generate_shark();
          }
          break;
        case 3: //right-click
          perspective_flag++;
          generate_shark();
          //code to navigate to right page
          break;
      }
    }, false);
  }
}

//get mouse position with respective to the readPixel corrdinate system
function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: Math.round(evt.clientX - rect.left),
    y: Math.round(evt.clientY - rect.top - ((evt.clientY - rect.top) - (canvas.height / 2)) * 2)
  };
}

//process each shark polygon part
function generate_shark() {
  perspective_matrix = perspective2(fovy, aspect, near, far, perspective_flag);

  shaderProgram.x_rotation = gl.getUniformLocation(shaderProgram, "x_rotation");
  shaderProgram.y_rotation = gl.getUniformLocation(shaderProgram, "y_rotation");
  shaderProgram.z_rotation = gl.getUniformLocation(shaderProgram, "z_rotation");
  shaderProgram.zoom = gl.getUniformLocation(shaderProgram, "zoom"); //set zoom matrix
  shaderProgram.perspective = gl.getUniformLocation(shaderProgram, "perspective");

  gl.uniformMatrix4fv(shaderProgram.x_rotation, false, new Float32Array(x_rotation_matrix));
  gl.uniformMatrix4fv(shaderProgram.y_rotation, false, new Float32Array(y_rotation_matrix));
  gl.uniformMatrix4fv(shaderProgram.z_rotation, false, new Float32Array(z_rotation_matrix));
  gl.uniformMatrix4fv(shaderProgram.perspective, false, new Float32Array(perspective_matrix));
  gl.uniformMatrix4fv(shaderProgram.zoom, false, new Float32Array(zoom_matrix));


  for (var i = 0; i < SHARK_COORD.length; i++) {
    smooth_shading_array.push(vec4(0, 0, 0, 0));
  }

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  point_array = [];
  nomral_array = [];

  //process shark polygons
  for (var i = 0; i < SHARK_POLY.length; i++) {
    ps_polygon(SHARK_POLY[i]);
  }

  //process normals
  for (var i = 0; i < SHARK_POLY.length; i++) {
    ps_normals(SHARK_POLY[i]);
  }
  render(point_array, normal_array, flat_shading_array, shader_flag); //render the shark
}

//Process_shark_polygon, takes input of single array of shark polygon index
function ps_polygon(poly) {
  var a, b, c;
  a = vec4(SHARK_COORD[poly[1] - 1]);
  for (var i = 1; i < poly.length - 2; i++) {
    b = vec4(SHARK_COORD[poly[i + 1] - 1]);
    c = vec4(SHARK_COORD[poly[i + 2] - 1]);
    point_array.push(a);
    point_array.push(b);
    point_array.push(c);

    var t1 = subtract(a, b);
    var t2 = subtract(b, c);
    var normal = normalize(cross(t1, t2));
    normal = vec4(normal);

    //adding normals to other adjecent normals
    smooth_shading_array[poly[1] - 1] = add(smooth_shading_array[poly[1] - 1], normal);
    smooth_shading_array[poly[i + 1] - 1] = add(smooth_shading_array[poly[i + 1] - 1], normal);
    smooth_shading_array[poly[i + 2] - 1] = add(smooth_shading_array[poly[i + 2] - 1], normal);

    //pushing flat shading normals
    flat_shading_array.push(normal);
    flat_shading_array.push(normal);
    flat_shading_array.push(normal);
  }
}

function ps_normals(poly) {
  var a, b, c;

  a = vec4(SHARK_COORD[poly[1] - 1]);
  for (var i = 1; i < poly.length - 2; i++) {
    b = vec4(SHARK_COORD[poly[i + 1] - 1]);
    c = vec4(SHARK_COORD[poly[i + 2] - 1]);

    normal_array.push(smooth_shading_array[poly[1] - 1]);
    normal_array.push(smooth_shading_array[poly[i + 1] - 1]);
    normal_array.push(smooth_shading_array[poly[i + 2] - 1]);
  }
}

function render(vert, smooth, flat, shader_flag) {
  init_v_buffer(vert);
  //determine between smooth and flat shading
  if (shader_flag % 2 == 0) {
    init_n_buffer(smooth);
  } else {
    init_n_buffer(flat);
  }
  gl.uniform4f(shaderProgram.colorUniform, 1, 1, 1, 1); //sets the color of the lines.
  gl.drawArrays(gl.TRIANGLES, 0, vert.length);
  //unbindBuffers();
}

function init_v_buffer(data) {
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(data), gl.STATIC_DRAW);
  gl.vertexAttribPointer(shaderProgram.vPosition, 4, gl.FLOAT, false, 0, 0);
}

function init_n_buffer(data) {
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(data), gl.STATIC_DRAW);
  gl.vertexAttribPointer(shaderProgram.vNormal, 4, gl.FLOAT, false, 0, 0);

}

function perspective2(fovy, aspect, near, far, perspective_flag) {
  //determine between perspective/orthographic toggle
  if (perspective_flag % 2 == 0) {
    var f = Math.tan(Math.PI * 0.5 - 0.5 * fovy);
    var rangeInv = 1.0 / (near - far);
    return [-f / aspect, 0, 0, 0,
      0, -f / aspect, 0, 0,
      0, 0, 1, -1,
      0, 0, near * far * rangeInv * 2, 1
    ];
  }
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]
}

//since unbinding every frame in the buffer doesn't change the result i've commented it out.
/*
function unbindBuffers() {
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}
*/

//SHADER STUFF. Pang said there was no need to comment on shader code in class.      
var fragShaderSource = "\
precision highp float;\
varying vec4 fColor;\
void main(void) {\
gl_FragColor = fColor;\
}\
";

var vtxShaderSource = "\
attribute vec4 vPosition;\
attribute vec4 vNormal;\
varying vec4 fColor;\
\
uniform vec4 ambientProduct, diffuseProduct, specularProduct;\
uniform vec4 lightPosition;\
uniform float shininess;\
\
uniform mat4 x_rotation;\
uniform mat4 y_rotation;\
uniform mat4 z_rotation;\
uniform mat4 perspective;\
uniform mat4 zoom;\
void main(void) {\
\
vec3 pos = (x_rotation * y_rotation * z_rotation * zoom * vPosition).xyz;\
vec3 L;\
\
    if(lightPosition.w == 0.0) L = normalize(lightPosition.xyz);\
    else L = normalize( lightPosition.xyz );\
    \
    vec3 E = -normalize( pos );\
    vec3 H = normalize( L + E );\
    \
    vec3 N = normalize(vNormal.xyz);\
    \
    vec4 ambient = ambientProduct;\
    \
    float Kd = max( dot(L, N), 0.0 );\
    vec4  diffuse = Kd*diffuseProduct;\
    \
    float Ks = pow( max(dot(N, H), 0.0), shininess );\
    vec4  specular = Ks * specularProduct;\
    \
    if( dot(L, N) < 0.0 ) {\
      specular = vec4(0.0, 0.0, 0.0, 1.0);\
    } \
    gl_Position = perspective * x_rotation * y_rotation * z_rotation * zoom * vPosition;\
\
    fColor = ambient + diffuse + specular ;\
\
    fColor.a = 1.0;\
}\
";

function get_shader(type, source) {
  var shader = gl.createShader(type); // Create the shader object
  gl.shaderSource(shader, source); // Set the shader source code.
  gl.compileShader(shader); // Compile the shader
  return shader;
}

function initShaders() {
  var vertexShader = get_shader(gl.VERTEX_SHADER, vtxShaderSource);
  var fragmentShader = get_shader(gl.FRAGMENT_SHADER, fragShaderSource);
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  gl.useProgram(shaderProgram);
  shaderProgram.vPosition = gl.getAttribLocation(shaderProgram, "vPosition");
  gl.enableVertexAttribArray(shaderProgram.vPosition);
  shaderProgram.vNormal = gl.getAttribLocation(shaderProgram, "vNormal");
  gl.enableVertexAttribArray(shaderProgram.vNormal);
  shaderProgram.colorUniform = gl.getUniformLocation(shaderProgram, "fColor");
}