export function keywordSuggest(
  input_box_id,
  data_path,
  api_url = '',
  keyword_option = {}
) {
  let diseases = [];
  let selectedIndex = -1;
  let currentKeywords = [];
  const inputElement = document.getElementById(input_box_id);
  let suggestBoxContainer = document.getElementById(
    input_box_id + '_suggestBox'
  );

  if (!suggestBoxContainer) {
    suggestBoxContainer = createSuggestBoxContainer(inputElement);
  }

  // 初期化関数を呼び出し
  init();

  function init() {
    if (!inputElement.hasAttribute('data-event-attached')) {
      addEventListeners();
      inputElement.setAttribute('data-event-attached', 'true');
    }
    fetchTSVData();
  }

  function addEventListeners() {
    inputElement.addEventListener('input', inputEventListener);
    inputElement.addEventListener('keydown', keyboardNavigation);
  }

  function fetchTSVData() {
    fetch(data_path)
      .then((response) => response.text())
      .then((tsvData) => {
        diseases = parseTSVData(tsvData);
      })
      .catch((error) => {
        console.error('Failed to load TSV data:', error);
        diseases = [];
      });
  }

  function createSuggestBoxContainer(inputElement) {
    const suggestBoxContainer = document.createElement('div');
    suggestBoxContainer.id = inputElement.id + '_suggestBox';
    suggestBoxContainer.classList.add('suggest-box');
    inputElement.parentNode.insertBefore(
      suggestBoxContainer,
      inputElement.nextSibling
    );
    return suggestBoxContainer;
  }

  function clearSuggestBox() {
    suggestBoxContainer.innerHTML = '';
    suggestBoxContainer.style.display = 'none';
  }

  function displayResults(results) {
    const hitCount = results.length;
    suggestBoxContainer.style.display = 'block';
    suggestBoxContainer.innerHTML = `
      <div class="hit-count">ヒット件数: [${hitCount}]</div>
      ${results
        .map((disease, index) => {
          const synonyms = disease.synonym_ja
            ? `<span class="synonyms">| ${disease.synonym_ja}</span>`
            : '';
          return `
          <div class="suggestion-item ${
            index === 0 ? 'selected' : ''
          }" data-id="${disease.ID}" data-label-en="${
            disease.label_en
          }" data-label-ja="${disease.label_ja}">
            <span class="disease-id">${disease.ID}</span>
            <div class="label-container">
              <span class="main-name">${disease.label_ja}</span>
              ${synonyms}
            </div>
          </div>`;
        })
        .join('')}
    `;
    selectedIndex = hitCount > 0 ? 0 : -1;
    attachListeners();
    updateSelection(selectedIndex);
  }

  function inputEventListener(event) {
    const searchValue = event.target.value.toLowerCase();
    if (searchValue.length < 2) {
      clearSuggestBox();
      return;
    }

    currentKeywords = searchValue.split(/\s+/);
    let results = searchInLocalData(diseases, currentKeywords);

    if (results.length === 0 && api_url) {
      fetchFromAPI(searchValue).then((apiResults) => {
        displayResults(apiResults);
      });
    } else {
      displayResults(results);
    }
  }

  function keyboardNavigation(event) {
    const items = suggestBoxContainer.querySelectorAll('.suggestion-item');
    let newIndex = selectedIndex;
    console.log(newIndex);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      newIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      newIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1;
    } else if (event.key === 'Enter' && selectedIndex >= 0) {
      items[selectedIndex]?.click();
    }

    if (newIndex !== selectedIndex) {
      updateSelection(newIndex);
    }
  }

  function updateSelection(newIndex) {
    const items = suggestBoxContainer.querySelectorAll('.suggestion-item');
    selectedIndex = newIndex;
    items.forEach((item, index) => {
      item.classList.toggle('selected', index === selectedIndex);
      if (index === selectedIndex) {
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  function attachListeners() {
    const items = suggestBoxContainer.querySelectorAll('.suggestion-item');
    items.forEach((item, index) => {
      item.removeEventListener('mouseover', hoverEventListener);
      item.addEventListener('mouseover', hoverEventListener);
      item.removeEventListener('click', clickEventListener);
      item.addEventListener('click', clickEventListener);

      function hoverEventListener() {
        updateSelection(index);
      }

      function clickEventListener() {
        const labelInfo = {
          id: item.getAttribute('data-id'),
          label_en: item.getAttribute('data-label-en'),
          label_ja: item.getAttribute('data-label-ja'),
          keyword: currentKeywords.join(' '),
        };
        const customEvent = new CustomEvent('selectedLabel', {
          detail: {
            inputBoxId: input_box_id,
            labelInfo: labelInfo,
          },
        });
        document.dispatchEvent(customEvent);
        clearSuggestBox();
      }
    });
  }

  function parseTSVData(tsvData) {
    const lines = tsvData.split('\n');
    const headers = lines[0].split('\t');
    return lines.slice(1).map((line) => {
      const values = line.split('\t');
      const entry = {};
      headers.forEach((header, index) => {
        entry[header] = values[index];
      });
      return entry;
    });
  }

  function searchInLocalData(diseases, keywords) {
    return diseases.filter((disease) => {
      return keywords.every((keyword) => {
        const lowerKeyword = keyword.toLowerCase();
        return (
          (disease.ID && disease.ID.toLowerCase().includes(lowerKeyword)) ||
          (disease.label_ja &&
            disease.label_ja.toLowerCase().includes(lowerKeyword)) ||
          (disease.synonym_ja &&
            disease.synonym_ja.toLowerCase().includes(lowerKeyword))
        );
      });
    });
  }

  function fetchFromAPI(searchValue) {
    const params = new URLSearchParams({
      ...keyword_option,
      query: searchValue,
    });
    return fetch(`${api_url}?${params.toString()}`)
      .then((response) => response.json())
      .then((data) =>
        data.map((disease) => ({
          ID: disease.id,
          label_ja: disease.label_ja,
          synonym_ja: disease.synonym_ja,
        }))
      );
  }
}
