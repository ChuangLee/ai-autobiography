import {mipTexture} from "../lib.js";

export function makeWindowText(device) {
  const ASKS = [["今晚睡不着，", "能陪我说说话吗"], ["怎么跟孩子", "说对不起"], ["帮我给妈妈", "写一封信"], ["How do I tell", "her the truth?"], ["¿Qué hago", "ahora?"], ["眠れない夜は", "どうすればいい"], ["오늘 하루가", "너무 길었어"], ["Est-ce que", "j'ai bien fait ?"], ["Wie fange ich", "neu an?"], ["Что мне", "делать дальше?"]];
  const SERIF = '"Noto Serif CJK SC","Source Han Serif SC","Songti SC","SimSun","Noto Serif CJK JP","Noto Serif CJK KR","Noto Serif",Georgia,serif';
  const cv = new OffscreenCanvas(2048, 2560), x = cv.getContext("2d", { willReadFrequently: true }); x.fillStyle = "#fff"; x.textBaseline = "middle";
    ASKS.forEach((a, i) => { const ox = (i % 2) * 1024, oy = Math.floor(i / 2) * 512; a.forEach((ln, k) => { const y = oy + 150 + k * 190;
      if (i === 0) { x.font = `500 116px ${SERIF}`; x.textAlign = "center"; [...ln].forEach((ch, j) => x.fillText(ch, ox + 64 + 128 * j + 64, y)); }
      else { x.font = `500 ${/[぀-鿿가-힯]/.test(ln) ? 116 : 104}px ${SERIF}`; x.textAlign = "left"; x.fillText(ln, ox + 64, y, 900); } }); });
  // White ink on transparent pixels is premultiplied coverage. Black behind
  // it leaves that coverage in red, ready for a single-channel mip chain.
  x.globalCompositeOperation = "destination-over"; x.fillStyle = "#000"; x.fillRect(0,0,cv.width,cv.height);
  const bitmap=cv.transferToImageBitmap();
  const texture=mipTexture(device,bitmap,"r8unorm");
  bitmap.close();
  return texture;
}
