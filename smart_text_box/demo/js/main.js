import { smartTextBox } from '../../smart_text_box.js';

// API（もしかして検索）あり、キーワード選択欄なし
smartTextBox('NANDO', './tsv/NANDO_sample.tsv', {
  api_url: 'http://localhost:5555/moshikashite_test_api?text=',
});

// API（もしかして検索）あり、キーワード選択欄あり
smartTextBox('MONDO', './tsv/mondo_sample.tsv', {
  api_url: 'http://localhost:5555/moshikashite_test_api?text=',
  includeNoMatch: true,
});

// API（もしかして検索）なし、キーワード選択欄なし
smartTextBox('ICD10', './tsv/icd10_sample.tsv');

document.addEventListener('selectedLabel', function (event) {
  const inputBoxId = event.detail.inputBoxId;
  const labelInfo = event.detail.labelInfo;
  switch (inputBoxId) {
    case 'NANDO':
      console.log('NANDO:', labelInfo);
      break;
    case 'MONDO':
      console.log('MONDO:', labelInfo);
      break;
    case 'ICD10':
      console.log('ICD10:', labelInfo);
      break;
    default:
      console.error('Unknown input box ID:', inputBoxId);
  }
});
