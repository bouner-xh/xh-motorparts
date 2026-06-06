// 產品數據
const products = {
    cylinder: [
        {
            id: 'CYL001',
            model: '1HV-11311-00',
            name: '汽缸套件',
            image: 'images/products/cylinder/cylinder-001.jpg',
            stock: 1000,
            specifications: ['STD', '47MM', '48MM', '50MM']
        },
        {
            id: 'CYL002',
            model: '2GM-11311-00',
            name: '汽缸套件',
            image: 'images/products/cylinder/cylinder-002.jpg',
            stock: 1000,
            specifications: ['STD', '48MM', '50MM']
        },
        {
            id: 'CYL003',
            model: '3KJ-11311-00',
            name: '汽缸套件',
            image: 'images/products/cylinder/cylinder-003.jpg',
            stock: 1000,
            specifications: ['STD', '47MM', '48MM']
        },
        {
            id: 'CYL004',
            model: '4KJ-11311-00',
            name: '汽缸套件',
            image: 'images/products/cylinder/cylinder-004.jpg',
            stock: 800,
            specifications: ['STD', '48MM', '50MM']
        },
        {
            id: 'CYL005',
            model: '5KJ-11311-00',
            name: '汽缸套件',
            image: 'images/products/cylinder/cylinder-005.jpg',
            stock: 800,
            specifications: ['STD', '48MM', '50MM']
        },
        {
            id: 'CYL006',
            model: '6KJ-11311-00',
            name: '汽缸套件',
            image: 'images/products/cylinder/cylinder-006.jpg',
            stock: 800,
            specifications: ['STD', '48MM', '50MM']
        }
    ],
    chain: [
        {
            id: 'CHN001',
            model: 'CH-428-120',
            name: '傳動鏈條',
            image: 'images/products/chain/chain-001.jpg',
            stock: 500,
            specifications: ['428-120目']
        },
        {
            id: 'CHN002',
            model: 'CH-428-130',
            name: '傳動鏈條',
            image: 'images/products/chain/chain-002.jpg',
            stock: 800,
            specifications: ['428-130目']
        },
        {
            id: 'CHN003',
            model: 'CH-420-120',
            name: '傳動鏈條',
            image: 'images/products/chain/chain-003.jpg',
            stock: 600,
            specifications: ['420-120目']
        }
    ],
    clutch: [
        {
            id: 'CLT001',
            model: 'CL-110-A',
            name: '離合器',
            image: 'images/products/clutch/clutch-001.jpg',
            stock: 300,
            specifications: ['110cc', '自動']
        },
        {
            id: 'CLT002',
            model: 'CL-125-M',
            name: '離合器',
            image: 'images/products/clutch/clutch-002.jpg',
            stock: 400,
            specifications: ['125cc', '手動']
        },
        {
            id: 'CLT003',
            model: 'CL-150-M',
            name: '離合器',
            image: 'images/products/clutch/clutch-003.jpg',
            stock: 250,
            specifications: ['150cc', '手動']
        }
    ],
    piston: [
        {
            id: 'PST001',
            model: 'PS-110-47',
            name: '活塞',
            image: 'images/products/piston/piston-001.jpg',
            stock: 700,
            specifications: ['110cc', '47mm']
        },
        {
            id: 'PST002',
            model: 'PS-125-52',
            name: '活塞',
            image: 'images/products/piston/piston-002.jpg',
            stock: 800,
            specifications: ['125cc', '52mm']
        },
        {
            id: 'PST003',
            model: 'PS-150-57',
            name: '活塞',
            image: 'images/products/piston/piston-003.jpg',
            stock: 500,
            specifications: ['150cc', '57mm']
        },
        {
            id: 'PST004',
            model: 'PS-110-48',
            name: '活塞',
            image: 'images/products/piston/piston-004.jpg',
            stock: 600,
            specifications: ['110cc', '48mm']
        },
        {
            id: 'PST005',
            model: 'PS-125-53',
            name: '活塞',
            image: 'images/products/piston/piston-005.jpg',
            stock: 700,
            specifications: ['125cc', '53mm']
        },
        {
            id: 'PST006',
            model: 'PS-150-58',
            name: '活塞',
            image: 'images/products/piston/piston-006.jpg',
            stock: 400,
            specifications: ['150cc', '58mm']
        }
    ],
    valve: [
        {
            id: 'VLV001',
            model: 'VL-110-IN',
            name: '汽門',
            image: 'images/products/valve/valve-001.jpg',
            stock: 1000,
            specifications: ['110cc', '進氣']
        },
        {
            id: 'VLV002',
            model: 'VL-110-EX',
            name: '汽門',
            image: 'images/products/valve/valve-002.jpg',
            stock: 1000,
            specifications: ['110cc', '排氣']
        }
    ],
    sprocket: [
        {
            id: 'SPK001',
            model: 'SP-428-14T',
            name: '齒輪',
            image: 'images/products/sprocket/sprocket-001.jpg',
            stock: 400,
            specifications: ['428', '14齒']
        },
        {
            id: 'SPK002',
            model: 'SP-428-15T',
            name: '齒輪',
            image: 'images/products/sprocket/sprocket-002.jpg',
            stock: 400,
            specifications: ['428', '15齒']
        },
        {
            id: 'SPK003',
            model: 'SP-420-14T',
            name: '齒輪',
            image: 'images/products/sprocket/sprocket-003.jpg',
            stock: 300,
            specifications: ['420', '14齒']
        }
    ],
    brake: [
        {
            id: 'BRK001',
            model: 'BR-110-F',
            name: '煞車片',
            image: 'images/products/brake/brake-001.jpg',
            stock: 600,
            specifications: ['110cc', '前輪']
        },
        {
            id: 'BRK002',
            model: 'BR-110-R',
            name: '煞車片',
            image: 'images/products/brake/brake-002.jpg',
            stock: 600,
            specifications: ['110cc', '後輪']
        },
        {
            id: 'BRK003',
            model: 'BR-125-F',
            name: '煞車片',
            image: 'images/products/brake/brake-003.jpg',
            stock: 500,
            specifications: ['125cc', '前輪']
        },
        {
            id: 'BRK004',
            model: 'BR-125-R',
            name: '煞車片',
            image: 'images/products/brake/brake-004.jpg',
            stock: 500,
            specifications: ['125cc', '後輪']
        }
    ],
    'oil-seal': [
        {
            id: 'OIL001',
            model: 'OS-110-12',
            name: '油封',
            image: 'images/products/oil-seal/oil-seal-001.jpg',
            stock: 1000,
            specifications: ['110cc', '12mm']
        },
        {
            id: 'OIL002',
            model: 'OS-125-15',
            name: '油封',
            image: 'images/products/oil-seal/oil-seal-002.jpg',
            stock: 800,
            specifications: ['125cc', '15mm']
        },
        {
            id: 'OIL003',
            model: 'OS-150-18',
            name: '油封',
            image: 'images/products/oil-seal/oil-seal-003.jpg',
            stock: 600,
            specifications: ['150cc', '18mm']
        },
        {
            id: 'OIL004',
            model: 'OS-110-14',
            name: '油封',
            image: 'images/products/oil-seal/oil-seal-004.jpg',
            stock: 900,
            specifications: ['110cc', '14mm']
        },
        {
            id: 'OIL005',
            model: 'OS-125-16',
            name: '油封',
            image: 'images/products/oil-seal/oil-seal-005.jpg',
            stock: 700,
            specifications: ['125cc', '16mm']
        }
    ],
    cable: [
        {
            id: 'CBL001',
            model: 'CB-110-T',
            name: '油門線',
            image: 'images/products/cable/cable-001.jpg',
            stock: 500,
            specifications: ['110cc', '油門']
        },
        {
            id: 'CBL002',
            model: 'CB-125-C',
            name: '離合器線',
            image: 'images/products/cable/cable-002.jpg',
            stock: 400,
            specifications: ['125cc', '離合器']
        },
        {
            id: 'CBL003',
            model: 'CB-150-B',
            name: '煞車線',
            image: 'images/products/cable/cable-003.jpg',
            stock: 300,
            specifications: ['150cc', '煞車']
        }
    ]
};

// 當前選中的類別
let currentCategory = 'cylinder';
let searchTimeout = null;

// 初始化頁面
document.addEventListener('DOMContentLoaded', () => {
    // 初始化翻譯器
    if (!window.translator) {
        window.translator = new Translator();
    }

    // 初始化模態框
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const closeBtn = document.getElementsByClassName('close')[0];

    // 關閉按鈕點擊事件
    closeBtn.onclick = function () {
        modal.style.display = "none";
    }

    // 點擊模態框外部關閉
    modal.onclick = function (event) {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    }

    // ESC鍵關閉模態框
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && modal.style.display === "block") {
            modal.style.display = "none";
        }
    });

    // 綁定類別切換事件
    document.querySelectorAll('.product-categories a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = e.target.dataset.category;
            if (!category) return;

            // 更新當前類別
            currentCategory = category;
            window.currentCategory = category;

            // 更新活動狀態
            document.querySelectorAll('.product-categories a').forEach(a => {
                a.classList.remove('active');
            });
            e.target.classList.add('active');

            // 更新產品列表
            loadProducts(category);

            // 更新語言
            if (window.translator) {
                window.translator.handleCategoryChange(category);
            }

            // 清空搜索框
            const searchInput = document.getElementById('product-search');
            if (searchInput) {
                searchInput.value = '';
            }
        });
    });

    // 綁定搜索功能
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            // 使用防抖動來優化搜索性能
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            searchTimeout = setTimeout(() => {
                filterProducts(e.target.value.trim());
            }, 300);
        });
    }

    // 從 URL 獲取類別
    const hash = window.location.hash.slice(1);
    if (hash && products[hash]) {
        currentCategory = hash;
        window.currentCategory = hash;

        // 更新活動狀態
        document.querySelectorAll('.product-categories a').forEach(a => {
            a.classList.remove('active');
            if (a.dataset.category === hash) {
                a.classList.add('active');
            }
        });
    }

    // 初始加載產品
    loadProducts(currentCategory);
});

// 加載產品
function loadProducts(category) {
    const productGrid = document.querySelector('.product-grid');
    if (!productGrid) return;

    productGrid.innerHTML = ''; // 清空現有產品

    const categoryProducts = products[category] || [];
    const lang = window.translator ? languages[window.translator.currentLang] : languages['zh-TW'];

    if (categoryProducts.length === 0) {
        productGrid.innerHTML = `<div class="no-products">${lang.noProducts}</div>`;
        return;
    }

    // 創建產品卡片
    categoryProducts.forEach(product => {
        const productElement = createProductElement(product);
        productGrid.appendChild(productElement);
    });

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

// 創建產品元素
function createProductElement(product) {
    const lang = window.translator ? languages[window.translator.currentLang] : languages['zh-TW'];
    const translatedName = lang.productNames[product.name] || product.name;
    const div = document.createElement('div');
    div.className = 'product-item';
    div.innerHTML = `
        <div class="product-image">
            <img src="${product.image}" alt="${translatedName}" onerror="this.src='images/no-image.jpg'" onclick="openImageModal(this.src)">
        </div>
        <div class="product-info">
            <h3>${translatedName}</h3>
            <p class="model">${lang.model}：${product.model}</p>
            <p class="specs">${lang.specifications}：${product.specifications.join(', ')}</p>
            <div class="product-status">
                <span class="stock">${lang.stock}：${product.stock}</span>
            </div>
            <button class="inquiry-btn" onclick="inquireProduct('${product.id}')">${lang.inquiry}</button>
        </div>
    `;
    return div;
}

// 打開圖片模態框
function openImageModal(imageSrc) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    modal.style.display = "block";
    modalImg.src = imageSrc;
}

// 產品搜索功能
function filterProducts(keyword) {
    const productGrid = document.querySelector('.product-grid');
    if (!productGrid) return;

    const categoryProducts = products[currentCategory] || [];
    const lang = languages[window.translator.currentLang] || languages['zh-TW'];

    if (!keyword) {
        loadProducts(currentCategory);
        return;
    }

    productGrid.innerHTML = '';
    const filteredProducts = categoryProducts.filter(product =>
        product.name.toLowerCase().includes(keyword.toLowerCase()) ||
        product.model.toLowerCase().includes(keyword.toLowerCase()) ||
        product.specifications.some(spec =>
            spec.toLowerCase().includes(keyword.toLowerCase())
        )
    );

    if (filteredProducts.length === 0) {
        productGrid.innerHTML = `<div class="no-products">${lang.noSearchResults}</div>`;
        return;
    }

    filteredProducts.forEach(product => {
        const productElement = createProductElement(product);
        productGrid.appendChild(productElement);
    });
}

// 詢價功能
function inquireProduct(productId) {
    const product = Object.values(products)
        .flat()
        .find(p => p.id === productId);

    if (!product) return;

    const lang = languages[window.translator.currentLang] || languages['zh-TW'];
    const translatedName = lang.productNames[product.name] || product.name;
    const message = `${lang.inquiryMessage}
${lang.productName}：${translatedName}
${lang.model}：${product.model}
${lang.specifications}：${product.specifications.join(', ')}

${lang.contactUs}：
${lang.phone}
${lang.email}`;

    alert(message);
} 