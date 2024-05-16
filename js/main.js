import { keywordSuggest } from './keywordSuggest.js';

document.addEventListener('DOMContentLoaded', () => {
  const inputBox1 = document.getElementById('inputBox1');
  const inputBox2 = document.getElementById('inputBox2');
  const inputBox3 = document.getElementById('inputBox3');

  inputBox1.addEventListener('input', () => {
    keywordSuggest('inputBox1', '../tsv/NANDO.tsv', {
      api_url: 'http://localhost:5555/moshikashite_test_api?text=',
    });
  });

  inputBox2.addEventListener('input', () => {
    keywordSuggest('inputBox2', '../tsv/mondo_sample.tsv', {
      api_url: 'http://localhost:5555/moshikashite_test_api?text=',
      includeNoMatch: true,
    });
  });

  inputBox3.addEventListener('input', () => {
    keywordSuggest('inputBox3', '../tsv/icd10_sample.tsv');
  });

  document.addEventListener('selectedLabel', function (event) {
    const inputBoxId = event.detail.inputBoxId;
    const labelInfo = event.detail.labelInfo;
    switch (inputBoxId) {
      case 'inputBox1':
        console.log('input box1:', labelInfo);
        break;
      case 'inputBox2':
        console.log('input box2:', labelInfo);
        break;
      case 'inputBox3':
        console.log('input box3:', labelInfo);
        break;
      default:
        console.error('Unknown input box ID:', inputBoxId);
    }
  });
});
