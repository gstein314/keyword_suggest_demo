/**
 * Suggests keywords based on input from a specified text box.
 *
 * @param {string} input_box_id - The ID of the input box element.
 * @param {string} data_path - The path to the TSV file containing keyword data.
 * @param {Object} [options={}] - An options object to specify additional settings.
 * @param {string} [options.api_url=''] - The URL of the API to fetch additional keyword suggestions (optional).
 * @param {boolean} [options.includeNoMatch=false] - Whether to include a "No Match" option when no keywords are found (optional).
 */
export function keywordSuggest(input_box_id, data_path, options = {}) {
  const { api_url = '', includeNoMatch = false } = options;

  let diseases = [];
  let selectedIndex = -1;
  let currentKeywords = [];
  let isComposing = false;
  const inputElement = document.getElementById(input_box_id);
  let suggestBoxContainer = document.getElementById(
    input_box_id + '_suggestBox'
  );

  const lang = document.documentElement.lang; // Get the lang attribute

  if (!suggestBoxContainer) {
    suggestBoxContainer = createSuggestBoxContainer(inputElement);
  }

  // Initialize the function
  init();

  /**
   * Initializes the keyword suggestion by setting up event listeners and fetching TSV data.
   */
  function init() {
    if (!inputElement.hasAttribute('data-event-attached')) {
      addEventListeners();
      fetchTSVData();
      inputElement.setAttribute('data-event-attached', 'true');
    }
  }

  /**
   * Adds necessary event listeners to the input element.
   */
  function addEventListeners() {
    inputElement.addEventListener('input', debounce(inputEventListener, 300));
    inputElement.addEventListener('keydown', keyboardNavigation);
    inputElement.addEventListener('compositionstart', () => {
      isComposing = true;
    });
    inputElement.addEventListener('compositionend', () => {
      isComposing = false;
    });
  }

  /**
   * Debounce function to delay the execution of a function.
   *
   * @param {Function} func - The function to debounce.
   * @param {number} wait - The time to wait before executing the function, in milliseconds.
   * @returns {Function} - The debounced function.
   */
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Fetches TSV data from the specified path and parses it.
   */
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

  /**
   * Creates a container for the suggestion box.
   *
   * @param {HTMLElement} inputElement - The input element.
   * @returns {HTMLElement} The created suggest box container.
   */
  function createSuggestBoxContainer(inputElement) {
    const suggestBoxContainer = document.createElement('ul');
    suggestBoxContainer.id = inputElement.id + '_suggestBox';
    suggestBoxContainer.classList.add('suggest-box');
    inputElement.parentNode.insertBefore(
      suggestBoxContainer,
      inputElement.nextSibling
    );
    return suggestBoxContainer;
  }

  /**
   * Clears the content of the suggestion box.
   */
  function clearSuggestBox() {
    suggestBoxContainer.innerHTML = '';
    suggestBoxContainer.style.display = 'none';
    inputElement.classList.remove('suggest-box-open'); // Remove the class when suggestion box is closed
  }

  /**
   * Displays the suggestion results in the suggestion box.
   *
   * @param {Array<Object>} results - The list of suggested keywords.
   * @param {boolean} fromAPI - Whether the results are from the API.
   */
  function displayResults(results, fromAPI = false) {
    let hitCount = fromAPI ? 0 : results.length;
    let suggestionsHtml = '';

    if (hitCount === 0 && includeNoMatch) {
      suggestionsHtml = `
      <li class="suggestion-item" data-id="該当なし" data-label-en="" data-label-ja="${currentKeywords.join(
        ' '
      )}">
        <span class="label-id">該当なし</span>
        <div class="label-container">
          <span class="main-name">${currentKeywords.join(' ')}</span>
        </div>
      </li>`;
    }

    suggestionsHtml += results
      .map((disease, index) => {
        const synonyms = disease.synonym_ja
          ? `<span class="synonyms">| ${disease.synonym_ja}</span>`
          : '';
        return `
      <li class="suggestion-item ${
        index === 0 && !suggestionsHtml ? 'selected' : ''
      }" data-id="${disease.ID}" data-label-en="${
          disease.label_en
        }" data-label-ja="${disease.label_ja}">
        <span class="label-id">${disease.ID}</span>
        <div class="label-container">
          <span class="main-name">${disease.label_ja}</span>
          ${synonyms}
        </div>
      </li>`;
      })
      .join('');

    const hitCountText = fromAPI
      ? lang === 'en'
        ? `Number of hits [0] <span class="suggestion-hint">By any chance:</span>`
        : `ヒット件数 [0] <span class="suggestion-hint">もしかして:</span>`
      : lang === 'en'
      ? `Number of hits [${hitCount}]`
      : `ヒット件数 [${hitCount}]`;

    suggestBoxContainer.innerHTML = `
    <div class="hit-count">${hitCountText}</div>
    ${suggestionsHtml}
  `;

    suggestBoxContainer.style.display = 'block';
    inputElement.classList.add('suggest-box-open'); // Add the class when suggestion box is open
    selectedIndex = results.length > 0 ? 0 : includeNoMatch ? 0 : -1;
    attachListeners();
    updateSelection(selectedIndex);
  }

  /**
   * Handles the input event for the input element.
   *
   * @param {Event} event - The input event.
   */
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
        if (apiResults.length === 0 && includeNoMatch) {
          displayResults([], true);
        } else {
          displayResults(apiResults, true);
        }
      });
    } else {
      displayResults(results);
    }
  }

  /**
   * Handles keyboard navigation for the suggestion items.
   *
   * @param {Event} event - The keyboard event.
   */
  function keyboardNavigation(event) {
    if (isComposing) return;

    const items = suggestBoxContainer.querySelectorAll('.suggestion-item');
    let newIndex = selectedIndex;

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

  /**
   * Updates the selection of suggestion items.
   *
   * @param {number} newIndex - The new index to be selected.
   */
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

  /**
   * Attaches event listeners to the suggestion items.
   */
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
        const isNoMatch = item.getAttribute('data-id') === '該当なし';
        const labelInfo = {
          ID: isNoMatch ? '' : item.getAttribute('data-id'),
          label_en: isNoMatch ? '' : item.getAttribute('data-label-en'),
          label_ja: isNoMatch ? '' : item.getAttribute('data-label-ja'),
          keyword: isNoMatch
            ? item.getAttribute('data-label-ja')
            : currentKeywords.join(' '),
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

  /**
   * Parses the TSV data and returns an array of objects.
   *
   * @param {string} tsvData - The TSV data as a string.
   * @returns {Array<Object>} The parsed TSV data.
   */
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

  /**
   * Searches for keywords in the local data.
   *
   * @param {Array<Object>} diseases - The list of diseases to search in.
   * @param {Array<string>} keywords - The list of keywords to search for.
   * @returns {Array<Object>} The list of matching diseases.
   */
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

  /**
   * Fetches keyword suggestions from the API.
   *
   * @param {string} searchValue - The search value to query the API with.
   * @returns {Promise<Array<Object>>} A promise that resolves to the list of suggested keywords.
   */
  function fetchFromAPI(searchValue) {
    const url = `${api_url}${encodeURIComponent(searchValue)}`;

    return fetch(url)
      .then((response) => response.json())
      .then((data) =>
        data.map((disease) => ({
          ID: disease.ID,
          label_ja: disease.label_ja,
          synonym_ja: disease.synonym_ja,
          label_en: disease.label_en,
          synonym_en: disease.synonym_en,
        }))
      );
  }
}
