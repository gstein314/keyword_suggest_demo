/**
 * Suggests keywords based on input from a specified text box.
 *
 * @param {string} input_box_id - The ID of the input box element.
 * @param {string} data_path - The path to the TSV file containing keyword data.
 * @param {Object} [options={}] - An options object to specify additional settings.
 * @param {string} [options.api_url=''] - The URL of the API to fetch additional keyword suggestions (optional).
 * @param {boolean} [options.includeNoMatch=false] - Whether to include a field to select the keyword itself if the keyword is not found (optional).
 */
export function smartTextBox(input_box_id, data_path, options = {}) {
  if (!input_box_id) {
    console.error('Error: input_box_id is required.');
    return;
  }

  if (!data_path) {
    console.error('Error: data_path is required.');
    return;
  }

  const { api_url = '', includeNoMatch = false } = options;

  let diseases = [];
  let selectedIndex = -1;
  let currentKeywords = [];
  let originalInputValue = '';
  let isComposing = false;
  const inputElement = document.getElementById(input_box_id);
  let suggestBoxContainer = document.getElementById(
    `${input_box_id}_suggestBox`
  );

  const lang = document.documentElement.lang;

  if (!suggestBoxContainer) {
    suggestBoxContainer = createSuggestBoxContainer(inputElement);
  }

  init();

  /**
   * Initializes the keyword suggestion feature by attaching event listeners and fetching the TSV data.
   */
  function init() {
    if (!inputElement.hasAttribute('data-event-attached')) {
      addEventListeners();
      fetchTSVData();
      inputElement.setAttribute('data-event-attached', 'true');
    }
  }

  /**
   * Adds event listeners to the input element for handling user input, keyboard navigation, and clicks outside the suggestion box.
   */
  /**
   * Adds event listeners to the input element for handling user input, keyboard navigation, and clicks outside the suggestion box.
   */
  function addEventListeners() {
    inputElement.addEventListener('input', debounce(handleInput, 300));
    inputElement.addEventListener('keydown', handleKeyboardNavigation);
    inputElement.addEventListener('compositionstart', () => {
      isComposing = true;
    });
    inputElement.addEventListener('compositionend', () => {
      isComposing = false;
    });
    inputElement.addEventListener('focus', handleFocus);
    document.addEventListener('click', handleClickOutside);
  }

  /**
   * Handles focus events on the input element to re-trigger the search if the input is not empty.
   */
  function handleFocus(event) {
    if (event.target.value.trim().length > 0) {
      handleInput(event);
    }
  }

  /**
   * Creates a debounced function that delays the execution of the input function until after a specified wait time has elapsed.
   * @param {Function} func - The function to debounce.
   * @param {number} wait - The number of milliseconds to delay.
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
   * Fetches the TSV data from the specified path and parses it into an array of keyword objects.
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
   * Creates and returns the suggestion box container element.
   * @param {HTMLElement} inputElement - The input element to attach the suggestion box container to.
   * @returns {HTMLElement} - The created suggestion box container.
   */
  function createSuggestBoxContainer(inputElement) {
    const container = document.createElement('ul');
    container.classList.add('suggest-box');
    inputElement.parentNode.insertBefore(container, inputElement.nextSibling);
    return container;
  }

  /**
   * Clears the suggestion box and hides it.
   */
  function clearSuggestBox() {
    suggestBoxContainer.innerHTML = '';
    suggestBoxContainer.style.display = 'none';
    inputElement.classList.remove('suggest-box-open');
    document.removeEventListener('click', handleClickOutside);
  }

  /**
   * Handles input events from the input element, normalizes the input value, and displays keyword suggestions.
   * @param {Event} event - The input event.
   */
  function handleInput(event) {
    originalInputValue = event.target.value;
    const searchValue = normalizeString(event.target.value);

    if (searchValue.trim().length < 2) {
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
   * Displays keyword suggestions in the suggestion box.
   * @param {Array} results - The list of keyword suggestions.
   * @param {boolean} [fromAPI=false] - Whether the results are from an API call.
   */
  function displayResults(results, fromAPI = false) {
    let hitCount = fromAPI ? 0 : results.length;
    let suggestionsHtml = '';
    const isEng = isEnglish(currentKeywords.join(' '));

    if (includeNoMatch) {
      suggestionsHtml += createKeywordSuggestion();
    }

    const hitCountText = createHitCountText(fromAPI, hitCount);

    suggestionsHtml += `<div class="hit-count">${hitCountText}</div>`;

    suggestionsHtml += results
      .map((disease, index) =>
        createSuggestionItem(disease, index, isEng, suggestionsHtml)
      )
      .join('');

    suggestBoxContainer.innerHTML = suggestionsHtml;
    suggestBoxContainer.style.display = 'block';
    inputElement.classList.add('suggest-box-open');
    selectedIndex = results.length > 0 ? 0 : includeNoMatch ? 0 : -1;

    attachListeners();
    updateSelection(selectedIndex);
    document.addEventListener('click', handleClickOutside);
  }

  /**
   * Creates the HTML for a keyword suggestion item.
   * @returns {string} - The HTML string for the keyword suggestion item.
   */
  function createKeywordSuggestion() {
    return `
      <li class="suggestion-item -keyword" data-id="noMatch" data-label-en="" data-label-ja="${currentKeywords.join(
        ' '
      )}">
        <div class="label-container">
          <span class="main-name">${currentKeywords.join(' ')}</span>
        </div>
      </li>`;
  }

  /**
   * Creates the HTML for a suggestion item.
   * @param {Object} disease - The disease object containing keyword data.
   * @param {number} index - The index of the suggestion item.
   * @param {boolean} isEng - Whether the input language is English.
   * @param {string} suggestionsHtml - The current HTML string for the suggestions.
   * @returns {string} - The HTML string for the suggestion item.
   */
  function createSuggestionItem(disease, index, isEng, suggestionsHtml) {
    const mainLabel = isEng ? disease.label_en : disease.label_ja;
    const synonyms = isEng ? disease.synonym_en : disease.synonym_ja;
    const highlightedID = highlightMatch(disease.ID, currentKeywords);
    const highlightedLabel = highlightMatch(mainLabel, currentKeywords);
    const highlightedSynonyms = synonyms
      ? highlightMatch(synonyms, currentKeywords)
      : '';

    return `
      <li class="suggestion-item ${
        index === 0 && !suggestionsHtml ? '-selected' : ''
      }" data-id="${disease.ID}" data-label-en="${
      disease.label_en
    }" data-label-ja="${disease.label_ja}">
        <span class="label-id">${highlightedID}</span>
        <div class="label-container">
          <span class="main-name">${highlightedLabel}</span>
          ${
            highlightedSynonyms
              ? `<span class="synonyms">| ${highlightedSynonyms}</span>`
              : ''
          }
        </div>
      </li>`;
  }

  /**
   * Creates the HTML for the hit count text.
   * @param {boolean} fromAPI - Whether the results are from an API call.
   * @param {number} hitCount - The number of hits.
   * @returns {string} - The HTML string for the hit count text.
   */
  function createHitCountText(fromAPI, hitCount) {
    return fromAPI
      ? lang === 'en'
        ? `Number of hits [0] <span class="suggestion-hint">By any chance:</span>`
        : `ヒット件数 [0] <span class="suggestion-hint">もしかして:</span>`
      : lang === 'en'
      ? `Number of hits [${hitCount}]`
      : `ヒット件数 [${hitCount}]`;
  }

  /**
   * Highlights matching keywords in the text.
   * @param {string} text - The text to highlight matches in.
   * @param {Array} keywords - The list of keywords to highlight.
   * @returns {string} - The text with highlighted matches.
   */
  function highlightMatch(text, keywords) {
    const allWidthKeywords = keywords.flatMap((keyword) => {
      const fullwidthKeyword = keyword.replace(/[0-9]/g, function (s) {
        return String.fromCharCode(s.charCodeAt(0) + 0xfee0);
      });
      return [keyword, fullwidthKeyword];
    });

    const allWidthRegex = new RegExp(
      `(${allWidthKeywords
        .map((keyword) => keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
        .join('|')})`,
      'gi'
    );

    const splitRegex = /(<[^>]+>|[^<]+)/g;
    const parts = text.split(splitRegex);

    const highlightedParts = parts.map((part) => {
      if (!part.startsWith('<')) {
        part = part.replace(allWidthRegex, '<span class="highlight">$&</span>');
        return part;
      }
      return part;
    });

    return highlightedParts.join('');
  }

  /**
   * Handles keyboard navigation within the suggestion box.
   * @param {KeyboardEvent} event - The keyboard event.
   */
  function handleKeyboardNavigation(event) {
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
   * Updates the selected suggestion item based on the new index.
   * @param {number} newIndex - The new index of the selected suggestion item.
   */
  function updateSelection(newIndex) {
    const items = suggestBoxContainer.querySelectorAll('.suggestion-item');
    selectedIndex = newIndex;
    items.forEach((item, index) => {
      item.classList.toggle('-selected', index === selectedIndex);
      if (index === selectedIndex) {
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  /**
   * Attaches event listeners to the suggestion items for handling mouse hover and click events.
   */
  function attachListeners() {
    const items = suggestBoxContainer.querySelectorAll('.suggestion-item');
    items.forEach((item, index) => {
      item.removeEventListener('mouseover', handleHover);
      item.addEventListener('mouseover', handleHover);
      item.removeEventListener('click', handleClick);
      item.addEventListener('click', handleClick);

      function handleHover() {
        updateSelection(index);
      }
      function handleClick() {
        const isNoMatch = item.getAttribute('data-id') === 'noMatch';
        const labelInfo = {
          ID: isNoMatch ? '' : item.getAttribute('data-id'),
          label_en: isNoMatch ? '' : item.getAttribute('data-label-en'),
          label_ja: isNoMatch ? '' : item.getAttribute('data-label-ja'),
          keyword: originalInputValue,
        };
        const customEvent = new CustomEvent('selectedLabel', {
          detail: { inputBoxId: input_box_id, labelInfo: labelInfo },
        });
        document.dispatchEvent(customEvent);
        clearSuggestBox();
      }
    });
  }

  /**
   * Parses the TSV data into an array of keyword objects.
   * @param {string} tsvData - The TSV data string.
   * @returns {Array} - The array of parsed keyword objects.
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
   * Normalizes the input string by converting it to NFKC form and lowercasing it.
   * @param {string} str - The string to normalize.
   * @returns {string} - The normalized string.
   */
  function normalizeString(str) {
    return str.normalize('NFKC').toLowerCase();
  }

  /**
   * Determines whether the input string is in English.
   * @param {string} str - The input string.
   * @returns {boolean} - True if the input string is in English, otherwise false.
   */
  function isEnglish(str) {
    const englishPattern = /^[A-Za-z0-9\s]+$/;
    return englishPattern.test(normalizeString(str));
  }

  /**
   * Searches for matching keywords in the local data based on the input keywords.
   * @param {Array} diseases - The array of keyword objects.
   * @param {Array} keywords - The array of input keywords.
   * @returns {Array} - The array of matching keyword objects.
   */
  function searchInLocalData(diseases, keywords) {
    const isEng = isEnglish(keywords.join(' '));
    return diseases.filter((disease) => {
      return keywords.every((keyword) => {
        const lowerKeyword = normalizeString(keyword);
        if (isEng) {
          return (
            (disease.ID &&
              normalizeString(disease.ID).includes(lowerKeyword)) ||
            (disease.label_en &&
              normalizeString(disease.label_en).includes(lowerKeyword)) ||
            (disease.synonym_en &&
              normalizeString(disease.synonym_en).includes(lowerKeyword))
          );
        } else {
          return (
            (disease.ID &&
              normalizeString(disease.ID).includes(lowerKeyword)) ||
            (disease.label_ja &&
              normalizeString(disease.label_ja).includes(lowerKeyword)) ||
            (disease.synonym_ja &&
              normalizeString(disease.synonym_ja).includes(lowerKeyword))
          );
        }
      });
    });
  }

  /**
   * Fetches keyword suggestions from the API based on the input value.
   * @param {string} searchValue - The input value to search for.
   * @returns {Promise<Array>} - A promise that resolves to an array of keyword objects.
   */
  function fetchFromAPI(searchValue) {
    const url = `${api_url}${encodeURIComponent(searchValue)}`;
    return fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        return response.json();
      })
      .then((data) =>
        data.map((disease) => ({
          ID: disease.ID,
          label_ja: disease.label_ja,
          synonym_ja: disease.synonym_ja,
          label_en: disease.label_en,
          synonym_en: disease.synonym_en,
        }))
      )
      .catch((error) => {
        console.error('Error fetching from API:', error);
        return [];
      });
  }

  /**
   * Handles clicks outside the suggestion box to hide it.
   * @param {MouseEvent} event - The click event.
   */
  function handleClickOutside(event) {
    if (
      suggestBoxContainer.style.display === 'block' &&
      !suggestBoxContainer.contains(event.target) &&
      !inputElement.contains(event.target)
    ) {
      clearSuggestBox();
    }
  }
}
