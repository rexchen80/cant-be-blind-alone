import * as tf from '@tensorflow/tfjs';
import yolo, { downloadModel } from 'tfjs-yolo-tiny';

import { Webcam } from './webcam';
import io from 'socket.io-client';
let socket = io.connect('http://localhost:8800');

var speechSU = new window.SpeechSynthesisUtterance();
speechSU.rate = 1.2;


let model;
const webcam = new Webcam(document.getElementById('webcam'));

(async function main() {


  try {
    ga();
    model = await downloadModel();

    await webcam.setup();

    //const SerialPort = require('serialport')
    //const port = new SerialPort('COM4',{
    //  baudRate: 57600
    //})
    

    doneLoading();
    run();




  } catch(e) {
    console.error(e);
    showError();
  }
})();

function stringToHex(str){
  　　　　var val="";
  　　　　for(var i = 0; i < str.length; i++){
  　　　　　　if(val == "")
  　　　　　　　　val = str.charCodeAt(i).toString(16);
  　　　　　　else
  　　　　　　　　val += "," + str.charCodeAt(i).toString(16);
  　　　　}
  　　　　return val;
}

async function run() {
  while (true) {
    const inputImage = webcam.capture();

    const t0 = performance.now();

    const boxes = await yolo(inputImage, model);

    inputImage.dispose();

    const t1 = performance.now();
    //console.log("YOLO inference took " + (t1 - t0) + " milliseconds.");
    //console.log('tf.memory(): ', tf.memory());

    clearRects();

    //console.log(Object.keys(boxes).length);
    if (Object.keys(boxes).length > 0){
      var x_pos = parseInt(boxes[0].left + (boxes[0].right - boxes[0].left)/2);

      
      var light_pos = parseInt((x_pos/400)*32);

      console.log(light_pos);
      //console.log(boxes[0].className);

      var light_pos_1 = parseInt(light_pos/10); 
      var light_pos_2 = parseInt(light_pos%10); 

      //var hexString = light_pos.toString(16);
      //console.log(hexString);
      var light_type = 0x00;
      if (boxes[0].className == "bottle") light_type = 0x67;  //g
      if (boxes[0].className == "person") light_type = 0x72; //r
      if (boxes[0].className == "cell phone") light_type = 0x62; //b

      var buf = [0x3c,light_type,0x3e,  light_pos_1+48,light_pos_2+48,0x3b];
      //var buf =  [0x3c,0x73];
      //buf = stringToHex("<s>5;");
      //let buf = ["<speed>",2,";"];
      socket.emit('web2sensor', { buf: JSON.stringify(buf) });

      speechSU.text = boxes[0].className;
window.speechSynthesis.speak(speechSU);

      /*
      port.write('<speed>');
      port.write(x_pos/10);
      port.write(';');
      */
    }

    boxes.forEach(box => {
      const {
        top, left, bottom, right, classProb, className,
      } = box;

      drawRect(left, top, right-left, bottom-top,
        `${className} ${Math.round(classProb * 100)}%`)
    });

    await tf.nextFrame();
  }
}

const webcamElem = document.getElementById('webcam-wrapper');

function drawRect(x, y, w, h, text = '', color = 'red') {
  const rect = document.createElement('div');
  rect.classList.add('rect');
  rect.style.cssText = `top: ${y}; left: ${x}; width: ${w}; height: ${h}; border-color: ${color}`;

  const label = document.createElement('div');
  label.classList.add('label');
  label.innerText = text;
  rect.appendChild(label);

  webcamElem.appendChild(rect);
}

function clearRects() {
  const rects = document.getElementsByClassName('rect');
  while(rects[0]) {
    rects[0].parentNode.removeChild(rects[0]);
  }
}

function doneLoading() {
  const elem = document.getElementById('loading-message');
  elem.style.display = 'none';

  const successElem = document.getElementById('success-message');
  successElem.style.display = 'block';

  const webcamElem = document.getElementById('webcam-wrapper');
  webcamElem.style.display = 'flex';
}

function showError() {
  const elem = document.getElementById('error-message');
  elem.style.display = 'block';
  doneLoading();
}

function ga() {
  if (process.env.UA) {
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', process.env.UA);
  }
}



