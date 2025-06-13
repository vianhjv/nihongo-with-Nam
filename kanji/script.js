// JavaScript for interactive features
document.addEventListener('DOMContentLoaded', function() {
    console.log('日本語 N4 Grammar Guide loaded successfully!');
    
    // Add smooth hover effects for grammar items
    const grammarItems = document.querySelectorAll('.grammar-item');
    
    grammarItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
        });
    });
    
    // Add click to expand/collapse functionality for examples
    const examples = document.querySelectorAll('.example');
    
    examples.forEach(example => {
        example.style.cursor = 'pointer';
        example.title = 'Click to highlight';
        
        example.addEventListener('click', function() {
            // Toggle highlight effect
            if (this.style.backgroundColor === 'rgb(255, 249, 196)') {
                this.style.backgroundColor = '';
                this.style.borderLeft = '4px solid #2196f3';
            } else {
                this.style.backgroundColor = '#fff9c4';
                this.style.borderLeft = '4px solid #ff9800';
            }
        });
    });
    
    // Add scroll-to-top functionality
    const scrollToTopBtn = document.createElement('div');
    scrollToTopBtn.innerHTML = '↑';
    scrollToTopBtn.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
        opacity: 0;
        visibility: hidden;
        z-index: 1000;
    `;
    
    document.body.appendChild(scrollToTopBtn);
    
    // Show/hide scroll to top button
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            scrollToTopBtn.style.opacity = '1';
            scrollToTopBtn.style.visibility = 'visible';
        } else {
            scrollToTopBtn.style.opacity = '0';
            scrollToTopBtn.style.visibility = 'hidden';
        }
    });
    
    // Scroll to top when clicked
    scrollToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Add hover effect to scroll to top button
    scrollToTopBtn.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.1)';
    });
    
    scrollToTopBtn.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
    });
    
    // Add progress indicator
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0%;
        height: 4px;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        z-index: 9999;
        transition: width 0.3s ease;
    `;
    
    document.body.appendChild(progressBar);
    
    // Update progress bar on scroll
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        progressBar.style.width = scrollPercent + '%';
    });
    
    // Add keyboard navigation
    document.addEventListener('keydown', function(event) {
        // Press 'T' to scroll to top
        if (event.key.toLowerCase() === 't') {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
        
        // Press 'B' to scroll to bottom
        if (event.key.toLowerCase() === 'b') {
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth'
            });
        }
    });
    
    // Add search functionality
    const searchContainer = document.createElement('div');
    searchContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
    `;
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search grammar...';
    searchInput.style.cssText = `
        padding: 10px;
        border: 2px solid #667eea;
        border-radius: 25px;
        outline: none;
        font-size: 14px;
        width: 200px;
        transition: all 0.3s ease;
    `;
    
    searchContainer.appendChild(searchInput);
    document.body.appendChild(searchContainer);
    
    // Search functionality
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const grammarHeaders = document.querySelectorAll('.grammar-header');
        
        grammarHeaders.forEach(header => {
            const grammarItem = header.closest('.grammar-item');
            const text = grammarItem.textContent.toLowerCase();
            
            if (text.includes(searchTerm) || searchTerm === '') {
                grammarItem.style.display = 'block';
                grammarItem.style.opacity = '1';
            } else {
                grammarItem.style.display = 'none';
                grammarItem.style.opacity = '0.3';
            }
        });
    });
    
    // Focus search on Ctrl+F
    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey && event.key === 'f') {
            event.preventDefault();
            searchInput.focus();
        }
    });
});