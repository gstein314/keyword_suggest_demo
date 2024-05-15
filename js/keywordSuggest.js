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

  function init() {
    inputElement.removeEventListener('input', inputEventListener);
    inputElement.removeEventListener('keydown', keyboardNavigation);

    inputElement.addEventListener('input', inputEventListener);
    inputElement.addEventListener('keydown', keyboardNavigation);

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

  function clearSuggestBox(suggestBoxContainer) {
    if (suggestBoxContainer) {
      suggestBoxContainer.innerHTML = '';
      suggestBoxContainer.style.display = 'none';
    }
  }

  function displayResults(diseases, container, keywords, inputBoxId) {
    const hitCount = diseases.length;
    container.style.display = 'block';
    container.innerHTML = `
      <div class="hit-count">ヒット件数: [${hitCount}]</div>
      ${diseases
        .map((disease, index) => {
          const synonyms = disease.synonym_ja
            ? `<span class="synonyms">| ${disease.synonym_ja}</span>`
            : '';
          return `
          <div class="suggestion-item ${index === 0 ? 'selected' : ''}" 
            data-id="${disease.ID}" 
            data-label-en="${disease.label_en}" 
            data-label-ja="${disease.label_ja}">
            <span class="disease-id">${disease.ID}</span>
            <div class="label-container">
              <span class="main-name">${disease.label_ja}</span>
              ${synonyms}
            </div>
          </div>
        `;
        })
        .join('')}
    `;
    selectedIndex = hitCount > 0 ? 0 : -1;
    attachClickListeners(currentKeywords, inputBoxId);
    updateSelection(container.querySelectorAll('.suggestion-item'));
    attachHoverListeners();
  }

  function attachHoverListeners() {
    const items = suggestBoxContainer.querySelectorAll('.suggestion-item');
    items.forEach((item, index) => {
      item.addEventListener('mouseover', () => {
        selectedIndex = index; // hoverされた時にselectedIndexを更新
        updateSelection(items); // UIの選択状態を更新
      });
    });
  }

  function inputEventListener(event) {
    const searchValue = event.target.value.toLowerCase();
    if (searchValue.length < 2) {
      clearSuggestBox(suggestBoxContainer);
      return;
    }

    currentKeywords = searchValue.split(/\s+/);
    let results = searchInLocalData(diseases, currentKeywords);

    if (results?.length === 0 && api_url) {
      fetchFromAPI(api_url, searchValue, keyword_option).then((apiResults) => {
        displayResults(
          apiResults,
          suggestBoxContainer,
          currentKeywords,
          input_box_id
        );
      });
    } else {
      displayResults(
        results,
        suggestBoxContainer,
        currentKeywords,
        input_box_id
      );
    }
  }

  function keyboardNavigation(event) {
    const items = suggestBoxContainer.querySelectorAll('.suggestion-item');
    let newIndex = selectedIndex; // 現在のselectedIndexを基に計算

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      newIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      newIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1;
    } else if (event.key === 'Enter' && selectedIndex >= 0) {
      items[selectedIndex]?.click(); // 確実にアイテムがある場合のみクリック
    }

    if (newIndex !== selectedIndex) {
      selectedIndex = newIndex;
      updateSelection(items);
    }
  }

  function updateSelection(items) {
    items.forEach((item, index) => {
      if (index === selectedIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); // 選択された要素が表示領域内に来るようにスクロール
      } else {
        item.classList.remove('selected');
      }
    });
  }

  function attachClickListeners(keywords, inputBoxId) {
    suggestBoxContainer.querySelectorAll('.suggestion-item').forEach((item) => {
      item.addEventListener('click', () => {
        const labelInfo = {
          id: item.getAttribute('data-id'),
          label_en: item.getAttribute('data-label-en'),
          label_ja: item.getAttribute('data-label-ja'),
          keyword: keywords.join(' '),
        };
        const customEvent = new CustomEvent('selectedLabel', {
          detail: {
            inputBoxId: inputBoxId,
            labelInfo: labelInfo,
          },
        });
        document.dispatchEvent(customEvent);
        clearSuggestBox(suggestBoxContainer);
      });
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
        const idMatch =
          disease.ID && disease.ID.toLowerCase().includes(lowerKeyword);
        const labelMatch =
          disease.label_ja &&
          disease.label_ja.toLowerCase().includes(lowerKeyword);
        const synonymMatch =
          disease.synonym_ja &&
          disease.synonym_ja.toLowerCase().includes(lowerKeyword);
        return idMatch || labelMatch || synonymMatch;
      });
    });
  }

  function fetchFromAPI(api_url, searchValue, keyword_option) {
    const params = new URLSearchParams({
      ...keyword_option,
      query: searchValue,
    });
    return fetch(`${api_url}?${params.toString()}`)
      .then((response) => response.json())
      .then((data) => {
        return data.map((disease) => ({
          id: disease.id,
          label_ja: disease.label_ja,
          synonym_ja: disease.synonym_ja,
        }));
      });
  }

  init(); // 初期化関数を呼び出し
}
