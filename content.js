// Function to check if current domain is in whitelist
function checkDomain(callback) {
    const currentDomain = window.location.hostname;
    
    chrome.storage.sync.get('whitelistedDomains', function(data) {
      const whitelistedDomains = data.whitelistedDomains || [];
      const isWhitelisted = whitelistedDomains.some(domain => 
        currentDomain === domain || currentDomain.endsWith('.' + domain)
      );
      
      callback(isWhitelisted);
    });
  }
  
  // Function to extract content without navigation elements
  function extractMainContent() {
    // Create a copy of the body to work with
    const bodyClone = document.body.cloneNode(true);
    
    // Elements to remove (common navigation and non-content elements)
    const selectorsToRemove = [
      'header', 'footer', 'nav', '.navigation', '.menu', '.navbar', '.nav-bar',
      '.sidebar', '.side-bar', '#sidebar', '#menu', '#navigation', '#header', '#footer',
      '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
      '.ad', '.ads', '.advertisement', '.social', '.sharing', '.share',
      '.comments', '.comment-section', '.related-posts', '.recommended'
    ];
    
    // Remove unwanted elements
    selectorsToRemove.forEach(selector => {
      const elements = bodyClone.querySelectorAll(selector);
      elements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    });
    
    // Try to identify main content area
    let mainContent = bodyClone.querySelector('main') || 
                      bodyClone.querySelector('article') || 
                      bodyClone.querySelector('.content') || 
                      bodyClone.querySelector('#content') || 
                      bodyClone;
    
    // Extract text, prioritizing paragraphs and headings
    let contentText = '';
    const contentElements = mainContent.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
    
    if (contentElements.length > 0) {
      contentElements.forEach(element => {
        contentText += element.textContent + '\n\n';
      });
    } else {
      // Fallback to all text if no paragraphs or headings found
      contentText = mainContent.textContent;
    }
    
    // Clean up the text (remove excess whitespace)
    contentText = contentText.replace(/\s+/g, ' ').trim();
    
    return {
      title: document.title,
      url: window.location.href,
      content: contentText,
      date: new Date().toISOString()
    };
  }
  
  // Function to send content to the server
  function sendToServer(content) {
    chrome.storage.sync.get('serverUrl', function(data) {
      const serverUrl = data.serverUrl || 'http://localhost:5000';
      
      fetch(`${serverUrl}/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(content)
      })
      .then(response => response.json())
      .then(data => {
        console.log('Content stored successfully:', data);
      })
      .catch(error => {
        console.error('Error storing content:', error);
      });
    });
  }
  
  // Main function to process the page
  function processPage() {
    // Check if we're on a whitelisted domain
    checkDomain(isWhitelisted => {
      if (isWhitelisted) {
        // Wait for page to fully load
        if (document.readyState === 'complete') {
          const content = extractMainContent();
          sendToServer(content);
        } else {
          window.addEventListener('load', () => {
            const content = extractMainContent();
            sendToServer(content);
          });
        }
      }
    });
  }
  
  // Run when the page is loaded
  processPage();