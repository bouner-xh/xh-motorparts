class Translator {
    constructor() {
        this.currentLang = localStorage.getItem('language') || 'zh-TW';
        this.init();
    }

    init() {
        // 添加語言切換按鈕
        this.addLanguageSwitcher();
        // 更新頁面內容
        this.updateContent();
    }

    addLanguageSwitcher() {
        // 檢查是否已經存在語言切換按鈕
        if (document.querySelector('.language-switcher')) {
            return;
        }

        const navbar = document.querySelector('.navbar');
        const languageSwitcher = document.createElement('div');
        languageSwitcher.className = 'language-switcher';

        const languageOptions = [
            { code: 'zh-TW', name: '繁體中文' },
            { code: 'zh-CN', name: '简体中文' },
            { code: 'en', name: 'English' }
        ];

        languageOptions.forEach(lang => {
            const button = document.createElement('button');
            button.textContent = lang.name;
            button.className = this.currentLang === lang.code ? 'active' : '';
            button.onclick = () => this.switchLanguage(lang.code);
            languageSwitcher.appendChild(button);
        });

        navbar.appendChild(languageSwitcher);
    }

    switchLanguage(langCode) {
        this.currentLang = langCode;
        localStorage.setItem('language', langCode);

        // 更新所有內容
        this.updateContent();
        this.updateActiveButton();

        // 如果在產品頁面，重新加載產品列表
        if (window.currentCategory) {
            // 更新產品類別標題
            const categoryTitle = document.querySelector('.product-header h1');
            if (categoryTitle) {
                categoryTitle.textContent = languages[langCode].categoryNames[window.currentCategory];
            }

            // 更新產品類別描述
            const categoryDescription = document.querySelector('.product-header p');
            if (categoryDescription) {
                categoryDescription.textContent = languages[langCode].categoryDescriptions[window.currentCategory];
            }

            // 更新產品列表
            loadProducts(window.currentCategory);

            // 更新產品類別名稱
            document.querySelectorAll('.product-categories a').forEach(link => {
                const category = link.dataset.category;
                if (category && languages[langCode].categoryNames[category]) {
                    link.textContent = languages[langCode].categoryNames[category];
                }
            });
        }
    }

    updateActiveButton() {
        document.querySelectorAll('.language-switcher button').forEach(button => {
            button.classList.remove('active');
            if (button.textContent === this.getLanguageName(this.currentLang)) {
                button.classList.add('active');
            }
        });
    }

    getLanguageName(code) {
        const names = {
            'zh-TW': '繁體中文',
            'zh-CN': '简体中文',
            'en': 'English'
        };
        return names[code];
    }

    updateContent() {
        const lang = languages[this.currentLang];
        if (!lang) return;

        // 更新頁面標題
        document.title = `${lang.companyName} - ${lang.heroTitle}`;

        // 更新導航鏈接
        document.querySelector('.logo h1').textContent = lang.companyName;

        // 更新導航連結文字
        document.querySelectorAll('.nav-links a').forEach(link => {
            const href = link.getAttribute('href');
            if (href === '#hero') {
                link.textContent = lang.home;
            } else if (href === '#about') {
                link.textContent = lang.about;
            } else if (href === 'products.html') {
                link.textContent = lang.products;
            } else if (href === '#contact') {
                link.textContent = lang.contact;
            }
        });

        // 更新主頁內容
        this.updateHomePage(lang);

        // 更新產品頁面內容
        this.updateProductPage(lang);

        // 更新頁腳
        document.querySelector('footer p').textContent = lang.copyright;
    }

    updateHomePage(lang) {
        // 檢查是否在主頁
        const heroContent = document.querySelector('.hero-content');
        if (!heroContent) return;

        // 更新英雄區域
        const heroTitle = heroContent.querySelector('h2');
        if (heroTitle) {
            heroTitle.textContent = lang.heroTitle;
        }

        const heroSubtitle = heroContent.querySelector('p');
        if (heroSubtitle) {
            heroSubtitle.textContent = lang.heroSubtitle;
        }

        // 更新產品區域
        const productsSection = document.querySelector('#products');
        if (productsSection) {
            const productsTitle = productsSection.querySelector('h2');
            if (productsTitle) {
                productsTitle.textContent = lang.productsTitle;
            }

            // 更新產品卡片
            const productCards = document.querySelectorAll('.product-card');
            if (productCards.length > 0) {
                productCards.forEach((card, index) => {
                    const title = card.querySelector('h3');
                    if (title) {
                        const products = [lang.cylinder, lang.chain, lang.clutch, lang.piston];
                        if (products[index]) {
                            title.textContent = products[index];
                        }
                    }
                });
            } else {
                // 如果沒有產品卡片，創建新的產品卡片
                const productGrid = productsSection.querySelector('.product-grid');
                if (productGrid) {
                    productGrid.innerHTML = `
                        <div class="product-card">
                            <img src="images/products/cylinder-1.jpg" alt="${lang.cylinder}">
                            <h3>${lang.cylinder}</h3>
                            <p>${lang.cylinderDesc}</p>
                        </div>
                        <div class="product-card">
                            <img src="images/products/chain-1.jpg" alt="${lang.chain}">
                            <h3>${lang.chain}</h3>
                            <p>${lang.chainDesc}</p>
                        </div>
                        <div class="product-card">
                            <img src="images/products/clutch-1.jpg" alt="${lang.clutch}">
                            <h3>${lang.clutch}</h3>
                            <p>${lang.clutchDesc}</p>
                        </div>
                        <div class="product-card">
                            <img src="images/products/piston-1.jpg" alt="${lang.piston}">
                            <h3>${lang.piston}</h3>
                            <p>${lang.pistonDesc}</p>
                        </div>
                    `;
                }
            }
        }

        // 更新關於我們區域
        const aboutSection = document.querySelector('#about');
        if (aboutSection) {
            const aboutTitle = aboutSection.querySelector('h2');
            if (aboutTitle) {
                aboutTitle.textContent = lang.aboutTitle;
            }

            const aboutContent = aboutSection.querySelector('.about-content p');
            if (aboutContent) {
                aboutContent.textContent = lang.aboutContent;
            }
        }

        // 更新聯絡我們區域
        const contactSection = document.querySelector('#contact');
        if (contactSection) {
            const contactTitle = contactSection.querySelector('h2');
            if (contactTitle) {
                contactTitle.textContent = lang.contactTitle;
            }

            const contactInfo = contactSection.querySelector('.contact-info');
            if (contactInfo) {
                contactInfo.innerHTML = `
                    <p>${lang.address}</p>
                    <p>${lang.phone}</p>
                    <p>${lang.email}</p>
                `;
            }
        }
    }

    updateProductPage(lang) {
        // 檢查是否在產品頁面
        const productSidebar = document.querySelector('.product-sidebar');
        if (!productSidebar) return;

        // 更新產品分類標題
        const sidebarTitle = productSidebar.querySelector('h2');
        if (sidebarTitle) {
            sidebarTitle.textContent = lang.productCategories;
        }

        // 更新搜索框佔位符
        const searchInput = document.getElementById('product-search');
        if (searchInput) {
            searchInput.placeholder = lang.searchPlaceholder;
        }

        // 更新產品類別名稱
        document.querySelectorAll('.product-categories a').forEach(link => {
            const category = link.dataset.category;
            if (category && lang.categoryNames[category]) {
                link.textContent = lang.categoryNames[category];
            }
        });

        // 更新產品列表
        const productGrid = document.querySelector('.product-grid');
        if (productGrid) {
            const noProducts = productGrid.querySelector('.no-products');
            if (noProducts) {
                noProducts.textContent = lang.noProducts;
            }
        }

        // 更新產品項目
        document.querySelectorAll('.product-item').forEach(item => {
            const modelText = item.querySelector('.model');
            if (modelText) {
                modelText.textContent = `${lang.model}：${modelText.textContent.split('：')[1]}`;
            }

            const specsText = item.querySelector('.specs');
            if (specsText) {
                specsText.textContent = `${lang.specifications}：${specsText.textContent.split('：')[1]}`;
            }

            const stockText = item.querySelector('.stock');
            if (stockText) {
                stockText.textContent = `${lang.stock}：${stockText.textContent.split('：')[1]}`;
            }

            const soldText = item.querySelector('.sold');
            if (soldText) {
                soldText.textContent = `${lang.sold}：${soldText.textContent.split('：')[1]}`;
            }

            const originalPrice = item.querySelector('.original');
            if (originalPrice) {
                originalPrice.textContent = `${lang.originalPrice}：${lang.currency} ${originalPrice.textContent.split('NT$')[1]}`;
            }

            const currentPrice = item.querySelector('.current');
            if (currentPrice) {
                currentPrice.textContent = `${lang.currentPrice}：${lang.currency} ${currentPrice.textContent.split('NT$')[1]}`;
            }

            const inquiryBtn = item.querySelector('.inquiry-btn');
            if (inquiryBtn) {
                inquiryBtn.textContent = lang.inquiry;
            }
        });

        // 更新產品類別標題
        const categoryTitle = document.querySelector('.product-header h1');
        if (categoryTitle && window.currentCategory) {
            categoryTitle.textContent = lang.categoryNames[window.currentCategory];
        }

        // 更新產品類別描述
        const categoryDescription = document.querySelector('.product-header p');
        if (categoryDescription) {
            const category = window.currentCategory;
            if (category && lang.categoryDescriptions && lang.categoryDescriptions[category]) {
                categoryDescription.textContent = lang.categoryDescriptions[category];
            }
        }
    }

    // 添加新方法來處理產品類別切換
    handleCategoryChange(category) {
        window.currentCategory = category;
        const lang = languages[this.currentLang];
        if (!lang) return;

        // 更新產品類別標題
        const categoryTitle = document.querySelector('.product-header h1');
        if (categoryTitle) {
            categoryTitle.textContent = lang.categoryNames[category];
        }

        // 更新產品類別描述
        const categoryDescription = document.querySelector('.product-header p');
        if (categoryDescription && lang.categoryDescriptions && lang.categoryDescriptions[category]) {
            categoryDescription.textContent = lang.categoryDescriptions[category];
        }
    }
}

// 初始化翻譯器
document.addEventListener('DOMContentLoaded', () => {
    new Translator();
}); 