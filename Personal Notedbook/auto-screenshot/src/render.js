/**
 * Renders a Theme Editor style settings panel as standalone HTML so every setting in
 * the theme can be screenshot locally — including blocks that are not placed on any
 * template and are therefore unreachable in the real editor.
 */

const PANEL_WIDTH = 340;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function asText(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? 'On' : 'Off';
  return String(value);
}

function optionLabel(setting) {
  const options = setting.options ?? [];
  const match = options.find((option) => option.value === setting.default);
  return match?.label ?? options[0]?.label ?? '';
}

function field(setting, control) {
  const label = setting.label ? `<div class="label">${escapeHtml(setting.label)}</div>` : '';
  const info = setting.info ? `<div class="info">${escapeHtml(setting.info)}</div>` : '';
  return `<div class="field">${label}${control}${info}</div>`;
}

function inputBox(setting, { multiline = false } = {}) {
  const value = asText(setting.default) || escapeHtml(setting.placeholder ?? '');
  const empty = value ? '' : ' is-empty';
  const text = value ? escapeHtml(value) : 'Enter value';
  return field(setting, `<div class="input${empty}${multiline ? ' input--tall' : ''}">${text}</div>`);
}

function selectBox(setting) {
  const value = optionLabel(setting) || asText(setting.default) || 'Select';
  return field(setting, `<div class="input input--select">${escapeHtml(value)}<span class="caret"></span></div>`);
}

function radioList(setting) {
  const items = (setting.options ?? [])
    .map((option) => {
      const active = option.value === setting.default ? ' is-on' : '';
      return `<div class="radio${active}"><span class="dot"></span>${escapeHtml(option.label)}</div>`;
    })
    .join('');
  return field(setting, `<div class="radios">${items}</div>`);
}

function checkbox(setting) {
  const on = setting.default === true ? ' is-on' : '';
  return `<div class="field field--flush">
    <label class="check"><span class="box${on}"></span><span>${escapeHtml(setting.label)}</span></label>
    ${setting.info ? `<div class="info info--indent">${escapeHtml(setting.info)}</div>` : ''}
  </div>`;
}

function rangeControl(setting) {
  const min = Number(setting.min ?? 0);
  const max = Number(setting.max ?? 100);
  const value = Number(setting.default ?? min);
  const span = max - min || 1;
  const percent = Math.min(100, Math.max(0, ((value - min) / span) * 100));
  const unit = setting.unit ? escapeHtml(setting.unit) : '';

  return `<div class="field">
    <div class="label label--row">
      <span>${escapeHtml(setting.label)}</span>
      <span class="pill">${escapeHtml(String(value))}${unit}</span>
    </div>
    <div class="slider">
      <div class="slider__track"><div class="slider__fill" style="width:${percent}%"></div></div>
      <div class="slider__thumb" style="left:${percent}%"></div>
    </div>
    <div class="slider__scale"><span>${escapeHtml(String(min))}${unit}</span><span>${escapeHtml(String(max))}${unit}</span></div>
    ${setting.info ? `<div class="info">${escapeHtml(setting.info)}</div>` : ''}
  </div>`;
}

function colorControl(setting) {
  const value = asText(setting.default) || 'none';
  const isColor = /^#|^rgb/.test(value);
  const swatch = isColor
    ? `<span class="swatch" style="background:${escapeHtml(value)}"></span>`
    : '<span class="swatch swatch--none"></span>';
  return field(setting, `<div class="input input--color">${swatch}<span>${escapeHtml(value)}</span></div>`);
}

function pickerControl(setting, placeholder) {
  const value = asText(setting.default);
  return field(
    setting,
    `<div class="input input--picker${value ? '' : ' is-empty'}">${escapeHtml(value || placeholder)}</div>`
  );
}

function imagePicker(setting) {
  return field(setting, '<div class="dropzone"><span>Select image</span></div>');
}

function alignmentControl(setting) {
  const values = ['left', 'center', 'right'];
  const items = values
    .map((value) => {
      const active = value === setting.default ? ' is-on' : '';
      return `<span class="segment${active}">${value[0].toUpperCase()}${value.slice(1)}</span>`;
    })
    .join('');
  return field(setting, `<div class="segments">${items}</div>`);
}

function headerRow(setting) {
  return `<div class="group">${escapeHtml(setting.label)}</div>`;
}

function paragraphRow(setting) {
  return `<p class="paragraph">${escapeHtml(setting.label)}</p>`;
}

const RENDERERS = {
  header: headerRow,
  paragraph: paragraphRow,
  checkbox,
  range: rangeControl,
  color: colorControl,
  color_background: colorControl,
  color_scheme: (s) => selectBox(s),
  select: selectBox,
  radio: radioList,
  text_alignment: alignmentControl,
  image_picker: imagePicker,
  textarea: (s) => inputBox(s, { multiline: true }),
  richtext: (s) => inputBox(s, { multiline: true }),
  inline_richtext: inputBox,
  html: (s) => inputBox(s, { multiline: true }),
  liquid: (s) => inputBox(s, { multiline: true }),
  text: inputBox,
  number: inputBox,
  url: (s) => pickerControl(s, 'Paste a link'),
  video_url: (s) => pickerControl(s, 'Paste a video URL'),
  video: (s) => pickerControl(s, 'Select video'),
  font_picker: (s) => pickerControl(s, 'Select font'),
  collection: (s) => pickerControl(s, 'Select collection'),
  collection_list: (s) => pickerControl(s, 'Select collections'),
  product: (s) => pickerControl(s, 'Select product'),
  product_list: (s) => pickerControl(s, 'Select products'),
  blog: (s) => pickerControl(s, 'Select blog'),
  page: (s) => pickerControl(s, 'Select page'),
  article: (s) => pickerControl(s, 'Select article'),
  link_list: (s) => pickerControl(s, 'Select menu'),
  metaobject: (s) => pickerControl(s, 'Select entry'),
  metaobject_list: (s) => pickerControl(s, 'Select entries')
};

function renderSetting(setting) {
  const renderer = RENDERERS[setting.type];
  if (renderer) return renderer(setting);
  return field(setting, `<div class="input is-empty">${escapeHtml(setting.type)}</div>`);
}

const STYLES = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    background: #f1f1f1;
    font-family: Inter, "Helvetica Neue", Helvetica, Arial, "DejaVu Sans", sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .panel {
    width: ${PANEL_WIDTH}px;
    background: #ffffff;
    border: 1px solid #e1e1e1;
    border-radius: 12px;
    box-shadow: 0 1px 2px rgba(0,0,0,.06);
    overflow: hidden;
  }
  .panel__head {
    padding: 14px 16px;
    border-bottom: 1px solid #e1e1e1;
    background: #fafafa;
  }
  .panel__title { font-size: 14px; font-weight: 650; color: #1a1a1a; line-height: 1.3; }
  .panel__meta { margin-top: 3px; font-size: 11px; color: #6b6b6b; font-family: ui-monospace, monospace; }
  .panel__body { padding: 12px 16px 18px; }
  .field { margin-top: 14px; }
  .field--flush { margin-top: 14px; }
  .field:first-child { margin-top: 2px; }
  .label { font-size: 13px; color: #303030; margin-bottom: 5px; line-height: 1.35; }
  .label--row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .pill {
    font-size: 12px; color: #303030; background: #f1f1f1;
    border-radius: 6px; padding: 2px 7px; white-space: nowrap;
  }
  .info { font-size: 12px; color: #6b6b6b; margin-top: 5px; line-height: 1.4; }
  .info--indent { margin-left: 26px; }
  .input {
    min-height: 32px; border: 1px solid #8a8a8a; border-radius: 8px;
    padding: 6px 10px; font-size: 13px; color: #1a1a1a; background: #fff;
    display: flex; align-items: center; gap: 8px; line-height: 1.35; word-break: break-word;
  }
  .input--tall { min-height: 64px; align-items: flex-start; }
  .input.is-empty { color: #8a8a8a; }
  .input--select { justify-content: space-between; background: #fff; }
  .caret {
    width: 0; height: 0; flex: none;
    border-left: 4px solid transparent; border-right: 4px solid transparent;
    border-top: 5px solid #4a4a4a;
  }
  .input--picker { color: #005bd3; }
  .input--picker.is-empty { color: #8a8a8a; }
  .swatch {
    width: 20px; height: 20px; flex: none; border-radius: 5px;
    border: 1px solid rgba(0,0,0,.18);
  }
  .swatch--none {
    background: repeating-conic-gradient(#d9d9d9 0% 25%, #ffffff 0% 50%) 50% / 8px 8px;
  }
  .group {
    margin-top: 20px; padding-top: 14px; border-top: 1px solid #e1e1e1;
    font-size: 13px; font-weight: 650; color: #1a1a1a;
  }
  .group:first-child { margin-top: 0; padding-top: 4px; border-top: 0; }
  .paragraph { font-size: 12px; color: #6b6b6b; margin: 10px 0 0; line-height: 1.45; }
  .check { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: #303030; line-height: 1.35; }
  .box {
    width: 18px; height: 18px; flex: none; margin-top: 1px;
    border: 1px solid #8a8a8a; border-radius: 5px; background: #fff;
  }
  .box.is-on { background: #303030; border-color: #303030; position: relative; }
  .box.is-on::after {
    content: ""; position: absolute; left: 5px; top: 2px;
    width: 5px; height: 9px; border: solid #fff; border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
  .radios { display: grid; gap: 8px; }
  .radio { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #303030; }
  .dot { width: 16px; height: 16px; flex: none; border: 1px solid #8a8a8a; border-radius: 50%; background: #fff; }
  .radio.is-on .dot { border: 5px solid #303030; }
  .slider { position: relative; height: 18px; margin: 6px 0 2px; }
  .slider__track { position: absolute; top: 7px; left: 0; right: 0; height: 4px; background: #e1e1e1; border-radius: 2px; }
  .slider__fill { height: 100%; background: #303030; border-radius: 2px; }
  .slider__thumb {
    position: absolute; top: 1px; width: 16px; height: 16px; margin-left: -8px;
    background: #fff; border: 1px solid #8a8a8a; border-radius: 50%;
    box-shadow: 0 1px 2px rgba(0,0,0,.15);
  }
  .slider__scale { display: flex; justify-content: space-between; font-size: 11px; color: #8a8a8a; }
  .segments { display: flex; border: 1px solid #8a8a8a; border-radius: 8px; overflow: hidden; }
  .segment { flex: 1; text-align: center; font-size: 12px; padding: 7px 0; color: #303030; border-right: 1px solid #d9d9d9; }
  .segment:last-child { border-right: 0; }
  .segment.is-on { background: #303030; color: #fff; }
  .dropzone {
    border: 1px dashed #8a8a8a; border-radius: 8px; background: #fafafa;
    padding: 18px; text-align: center; font-size: 13px; color: #005bd3;
  }
`;

export function renderPanelHtml({ title, meta, settings }) {
  const body = settings.length
    ? settings.map(renderSetting).join('\n')
    : '<p class="paragraph">This item has no settings.</p>';

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${STYLES}</style></head>
<body>
  <div class="panel">
    <div class="panel__head">
      <div class="panel__title">${escapeHtml(title)}</div>
      ${meta ? `<div class="panel__meta">${escapeHtml(meta)}</div>` : ''}
    </div>
    <div class="panel__body">${body}</div>
  </div>
</body>
</html>`;
}
