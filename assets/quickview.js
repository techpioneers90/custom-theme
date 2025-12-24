// Quickview Modal Functions
// متغير عام لحفظ ارتفاع أول صورة (مرة واحدة فقط) - مثل صفحة المنتج
let fixedQuickViewHeight = null;

function openQuickView(productId, productSlug) {
  const modal = new bootstrap.Modal(document.getElementById('quickview-modal'));
  const modalBody = document.getElementById('quickview-modal-body');
  
  // إظهار loading
  modalBody.innerHTML = `
    <div class="quickview-loading text-center py-5">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3">جاري تحميل بيانات المنتج...</p>
    </div>
  `;
  
  modal.show();
  
  // جلب بيانات المنتج باستخدام fetch مباشرة
  const apiUrl = `/api/v1/products/${productId}`;
  
  fetch(apiUrl)
    .then(res => {
      if (!res.ok) {
        throw new Error('Failed to fetch product');
      }
      return res.json();
    })
    .then(data => {
      // التحقق من هيكل البيانات
      let product = null;
      let attributes = null;
      
      // محاولة استخراج المنتج من هيكل البيانات المختلف
      if (data && data.product) {
        product = data.product;
        attributes = data.attributes || data.product.attributes || product.attributes;
      } else if (data && data.data && data.data.product) {
        product = data.data.product;
        attributes = data.data.attributes || data.data.product.attributes || product.attributes;
      } else if (data && data.id) {
        product = data;
        attributes = data.attributes || product.attributes;
      }
      
      // إذا لم تكن attributes موجودة، نحاول جلبها من API بشكل منفصل
      if (product && !attributes) {
        // محاولة جلب attributes من API إذا كانت متوفرة
        const attributesUrl = `/api/v1/products/${productId}/attributes`;
        return fetch(attributesUrl)
          .then(res => {
            if (res.ok) {
              return res.json().then(attrData => {
                attributes = attrData.attributes || attrData.data?.attributes || attrData;
                return { product, attributes };
              }).catch(() => ({ product, attributes: null }));
            }
            return { product, attributes: null };
          })
          .catch(() => ({ product, attributes: null }));
      }
      
      return Promise.resolve({ product, attributes });
    })
    .then(({ product, attributes }) => {
      if (product) {
        renderQuickView(product, productSlug, attributes);
      } else {
        console.error('Product data not found in response');
        showErrorAndRedirect(productSlug);
      }
    })
    .catch(function(error) {
      console.error('Error loading product:', error);
      showErrorAndRedirect(productSlug);
    });
}

function showErrorAndRedirect(productSlug) {
  const modalBody = document.getElementById('quickview-modal-body');
  modalBody.innerHTML = `
    <div class="text-center py-5">
      <p class="text-danger">فشل تحميل بيانات المنتج</p>
      <button type="button" class="btn btn-primary" onclick="window.location.href='/products/${productSlug}'">
        عرض صفحة المنتج
      </button>
    </div>
  `;
}

function renderQuickView(product, productSlug, attributes = null) {
  const modalBody = document.getElementById('quickview-modal-body');
  
  if (!modalBody) {
    console.error('Modal body not found');
    return;
  }
  
  // إعادة تعيين الارتفاع عند فتح مودال جديد
  fixedQuickViewHeight = null;
  
  // إذا لم يتم تمرير attributes، نحاول جلبها من product
  if (!attributes && product.attributes) {
    attributes = product.attributes;
  }
  
  // بناء صور المنتج للـ Swiper
  let imagesHTML = '';
  let hasMultipleImages = false;
  if (product.images && product.images.length > 0) {
    hasMultipleImages = product.images.length > 1;
    imagesHTML = product.images.map((img, index) => {
      const imgSrc = (img.image && (img.image.full_size || img.image.medium || img.image.small)) || 
                     (img.full_size || img.medium || img.small) || 
                     (typeof img === 'string' ? img : '');
      const loadingAttr = index === 0 ? 'eager' : 'lazy';
      return `
        <div class="swiper-slide">
          <img src="${imgSrc}" alt="${product.name || ''}" class="img-fluid" loading="${loadingAttr}" ${index === 0 ? 'fetchpriority="high"' : ''}>
        </div>
      `;
    }).join('');
  } else if (product.main_image) {
    const imgSrc = (product.main_image.image && (product.main_image.image.full_size || product.main_image.image.medium || product.main_image.image.small)) ||
                   (product.main_image.full_size || product.main_image.medium || product.main_image.small) ||
                   (typeof product.main_image === 'string' ? product.main_image : '');
    imagesHTML = `
      <div class="swiper-slide">
        <img src="${imgSrc}" alt="${product.name || ''}" class="img-fluid" loading="eager" fetchpriority="high">
      </div>
    `;
  } else {
    imagesHTML = `
      <div class="swiper-slide">
        <img src="${window.asset_url || ''}product-img.svg" alt="${product.name || ''}" class="img-fluid" loading="eager">
      </div>
    `;
  }
  
  // بناء السعر - التعامل مع variants إذا كان المنتج يحتوي على variants
  let currentProduct = product;
  let priceHTML = '';
  
  // إذا كان المنتج يحتوي على variants، نستخدم أول variant
  if (product.variants && product.variants.length > 0) {
    currentProduct = product.variants[0];
  }
  
  if (currentProduct.sale_price !== null && currentProduct.sale_price !== undefined && 
      currentProduct.price && currentProduct.sale_price < currentProduct.price) {
    const discount = currentProduct.discount_percentage || 
                     Math.round(((currentProduct.price - currentProduct.sale_price) / currentProduct.price) * 100);
    const currencySymbol = currentProduct.currency_symbol || product.currency_symbol || '';
    priceHTML = `
      <div class="quickview-price">
        <span class="price-new">${currentProduct.formatted_sale_price || (currentProduct.sale_price + ' ' + currencySymbol)}</span>
        <div class="price-wafar">
          <span class="price-old">${currentProduct.formatted_price || (currentProduct.price + ' ' + currencySymbol)}</span>
          ${discount > 0 ? `<span class="discount">- ${discount}%</span>` : ''}
        </div>
      </div>
    `;
  } else {
    const currencySymbol = currentProduct.currency_symbol || product.currency_symbol || '';
    priceHTML = `
      <div class="quickview-price">
        <span class="price-new">${currentProduct.formatted_price || (currentProduct.price + ' ' + currencySymbol)}</span>
      </div>
    `;
  }
  
  // بناء خيارات المنتج - ul li format
  let optionsHTML = '';
  let selectedOptions = {}; // لتخزين الخيارات المختارة افتراضياً
  
  // إذا كان المنتج يحتوي على options (variants)
  if (product.options && product.options.length > 0) {
    // تحديد الخيارات الافتراضية من أول variant متاح
    if (product.variants && product.variants.length > 0) {
      const firstAvailableVariant = product.variants.find(v => !v.unavailable) || product.variants[0];
      if (firstAvailableVariant && firstAvailableVariant.attributes) {
        firstAvailableVariant.attributes.forEach((attr, index) => {
          const valueName = attr.value || attr.name;
          if (valueName && product.options[index]) {
            selectedOptions[product.options[index].id] = valueName;
          }
        });
      }
    }
    
    optionsHTML = product.options.map((option, optionIndex) => {
      // جمع القيم الفريدة من variants لهذا الـ option
      const optionValues = [];
      const seenValues = new Set(); // استخدام Set لتجنب التكرار
      const variantImagesMap = {}; // لحفظ صور كل قيمة
      
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach((variant, variantIndex) => {
          if (!variant.unavailable && variant.attributes && Array.isArray(variant.attributes)) {
            // البحث عن attribute ينتمي لهذا الـ option
            // استخدام نفس الطريقة المستخدمة في product-card-options.js
            let matchingAttr = null;
            
            // أولاً: البحث باستخدام option_id إذا كان متوفراً
            if (option.id) {
              matchingAttr = variant.attributes.find(attr => attr.option_id === option.id);
            }
            
            // ثانياً: البحث باستخدام name (مثل product-card-options.js)
            if (!matchingAttr && option.name) {
              matchingAttr = variant.attributes.find(attr => attr.name === option.name);
            }
            
            // ثالثاً: استخدام الفهرس كبديل (مثل صفحة المنتج template)
            if (!matchingAttr && variant.attributes.length > optionIndex) {
            const attr = variant.attributes[optionIndex];
              // التحقق من أن الـ attribute لا يحتوي على option_id أو name مختلف
              if (attr && (!attr.option_id || attr.option_id === option.id) && 
                  (!attr.name || attr.name === option.name)) {
                matchingAttr = attr;
              }
            }
            
            if (!matchingAttr) return;
            
            const valueId = matchingAttr.option_value_id || matchingAttr.id || matchingAttr.value_id;
            const valueName = matchingAttr.value || matchingAttr.name;
            
            // التأكد من أن القيمة موجودة وصالحة
            if (!valueName || valueName.trim() === '') {
              return;
            }
            
            // استخدام valueName كـ key فريد (مع optionIndex) لتجنب التكرار
            // هذا يضمن أن نفس القيمة في options مختلفة تعتبر قيم مختلفة
            // على سبيل المثال: "S" في option 0 (اللون) و "S" في option 1 (المقاس) تعتبر قيم مختلفة
            const uniqueKey = `${optionIndex}-${valueName}`;
            if (seenValues.has(uniqueKey)) {
              return; // تخطي إذا كانت هذه القيمة موجودة بالفعل في هذا الـ option
            }
            seenValues.add(uniqueKey);
            
            
            // جمع صور variant لهذه القيمة
            let variantImages = [];
            if (variant.images && variant.images.length > 0) {
              variantImages = variant.images.map(img => {
                const imgSrc = (img.image && (img.image.full_size || img.image.medium || img.image.small)) ||
                              (img.full_size || img.medium || img.small) ||
                              (typeof img === 'string' ? img : '');
                return imgSrc;
              }).filter(img => img);
            } else if (variant.main_image) {
              const mainImg = (variant.main_image.image && (variant.main_image.image.full_size || variant.main_image.image.medium || variant.main_image.image.small)) ||
                             (variant.main_image.full_size || variant.main_image.medium || variant.main_image.small) ||
                             (typeof variant.main_image === 'string' ? variant.main_image : '');
              if (mainImg) {
                variantImages.push(mainImg);
              }
            }
            
              optionValues.push({
                id: valueId,
              name: valueName,
              variantId: variant.id,
              variantImages: variantImages
              });
            
            // حفظ صور variant لهذه القيمة
            if (variantImages.length > 0) {
              variantImagesMap[valueName] = variantImages;
            }
          }
        });
      }
      
      if (optionValues.length === 0) {
        return '';
      }
      
      const selectedValue = selectedOptions[option.id] || optionValues[0].name;
      
      const optionsList = optionValues.map(opt => {
        const isActive = opt.name === selectedValue ? 'active' : '';
        
        // إضافة معلومات الصور للـ variant
        let variantImagesAttr = '';
        if (opt.variantImages && opt.variantImages.length > 0) {
          variantImagesAttr = `data-variant-images='${JSON.stringify(opt.variantImages)}'`;
        }
        
        return `<li value="${opt.name}" onclick="quickViewOptionListItemClicked(event)" class="${isActive}" data-option-index="${optionIndex}" data-variant-id="${opt.variantId || ''}" ${variantImagesAttr}>
          <span>${opt.name}</span>
        </li>`;
      }).join('');
      
      return `
        <div class="form-group">
          <div>
            <label>${option.name}: <span>${selectedValue}</span></label>
            <ul name="${option.name}" index="${optionIndex}" data-option-id="${option.id}">
            ${optionsList}
            </ul>
          </div>
        </div>
      `;
    }).filter(html => html !== '').join('');
    
  } else if (product.custom_input_fields && product.custom_input_fields.length > 0) {
    optionsHTML = product.custom_input_fields.map(field => {
      if (field.type === 'text' || field.type === 'textarea') {
        return `
          <div class="form-group mb-3">
            <label>${field.name} ${field.required ? '<span class="text-danger">*</span>' : ''}</label>
            ${field.type === 'textarea' 
              ? `<textarea class="form-control quickview-field-input" data-field-id="${field.id}" name="field_${field.id}" ${field.required ? 'required' : ''}></textarea>`
              : `<input type="text" class="form-control quickview-field-input" data-field-id="${field.id}" name="field_${field.id}" ${field.required ? 'required' : ''}>`
            }
          </div>
        `;
      } else if (field.type === 'select' && field.options) {
        const fieldOptions = field.options.map(opt => 
          `<option value="${opt.id}">${opt.name}</option>`
        ).join('');
        return `
          <div class="form-group mb-3">
            <label>${field.name} ${field.required ? '<span class="text-danger">*</span>' : ''}</label>
            <select class="form-control quickview-field-input" data-field-id="${field.id}" name="field_${field.id}" ${field.required ? 'required' : ''}>
              <option value="">اختر ${field.name}</option>
              ${fieldOptions}
            </select>
          </div>
        `;
      }
      return '';
    }).join('');
  }
  
  // HTML للمodal
  const quickViewHTML = `
    <div class="quickview-container">
      <div class="row">
        <div class="col-md-6">
          <div class="quickview-images">
            <button type="button" class="quickview-close-btn" aria-label="إغلاق" onclick="closeQuickView()">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div class="swiper quickview-swiper">
              <div class="swiper-wrapper">
              ${imagesHTML}
            </div>
              <div class="swiper-button-next"></div>
              <div class="swiper-button-prev"></div>
              </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="quickview-content">
            <h2 class="quickview-title">${product.name || 'منتج'}</h2>
            ${priceHTML}
            
            ${product.short_description ? `
              <div class="quickview-description">
                ${product.short_description}
              </div>
            ` : ''}
            
            ${optionsHTML ? `
              <div class="quickview-options">
                <form id="quickview-product-form">
                  <input id="product-id" type="hidden" value="${product.id}">
                  <div id="quickview-variants-options">
                  ${optionsHTML}
                  </div>
                </form>
              </div>
            ` : ''}
            
            <div class="quickview-quantity">
              <label>الكمية</label>
              <div class="quantity-input d-inline-flex align-items-center">
                <button type="button" class="btn-quantity increase-quantity-quickview" aria-label="increase">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none">
                    <path d="M12 4V20M20 12H4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <input type="number" id="quickview-quantity-input" class="product-quantity-input" value="1" min="1" max="${(currentProduct.is_infinite === false && currentProduct.quantity) ? currentProduct.quantity : (product.is_infinite === false && product.quantity) ? product.quantity : 100}" readonly>
                <button type="button" class="btn-quantity decrease-quantity-quickview" aria-label="decrease">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none">
                    <path d="M20 12L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <div class="quickview-actions">
              <button type="button" class="btn btn-primary btn-add-to-cart-quickview" onclick="addToCartFromQuickView('${product.id}')">
                <img loading="lazy" class="add-to-cart-progress d-none" src="${window.asset_url || ''}spinner.gif" width="20" height="20"/>
                ${window.i18n?.add_to_cart || 'أضف إلى السلة'}
              </button>
              <a href="/products/${productSlug}" class="btn btn-outline-primary">
                ${window.i18n?.go_to_product_page || 'عرض صفحة المنتج'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  modalBody.innerHTML = quickViewHTML;
  
  // حفظ بيانات المنتج في data attribute للوصول إليها لاحقاً
  modalBody.setAttribute('data-product-data', JSON.stringify({
    product: product,
    variants: product.variants || [],
    options: product.options || []
  }));
  
  // حفظ ارتفاع أول صورة (مرة واحدة فقط) - مثل صفحة المنتج
  function applyFixedQuickViewHeight() {
    // إذا كان الارتفاع محفوظاً بالفعل، استخدمه مباشرة
    if (fixedQuickViewHeight !== null) {
      const px = fixedQuickViewHeight + 'px';
      const swiperElement = modalBody.querySelector('.quickview-swiper');
      if (swiperElement) {
        swiperElement.style.height = px;
        swiperElement.style.minHeight = px;
        const wrapper = swiperElement.querySelector('.swiper-wrapper');
        if (wrapper) wrapper.style.height = px;
        const slides = swiperElement.querySelectorAll('.swiper-slide');
        slides.forEach(slide => {
          slide.style.height = px;
        });
      }
      return;
    }
    
    const swiperElement = modalBody.querySelector('.quickview-swiper');
    if (!swiperElement) return;
    
    const firstImage = swiperElement.querySelector('.swiper-slide:first-child img');
    if (!firstImage) return;
    
    const setHeights = function(h) {
      if (!h || h <= 0) return;
      
      // حفظ الارتفاع الأول فقط (مرة واحدة)
      if (fixedQuickViewHeight === null) {
        fixedQuickViewHeight = h;
      }
      
      const px = fixedQuickViewHeight + 'px';
      swiperElement.style.height = px;
      swiperElement.style.minHeight = px;
      swiperElement.setAttribute('data-fixed-height', fixedQuickViewHeight);
      
      const wrapper = swiperElement.querySelector('.swiper-wrapper');
      if (wrapper) wrapper.style.height = px;
      const slides = swiperElement.querySelectorAll('.swiper-slide');
      slides.forEach(slide => {
        slide.style.height = px;
      });
    };
    
    if (firstImage.complete && firstImage.naturalHeight > 0) {
      setHeights(firstImage.offsetHeight || firstImage.naturalHeight);
    } else {
      firstImage.onload = function() {
        setHeights(this.offsetHeight || this.naturalHeight);
      };
      // fallback
      setTimeout(() => {
        if (firstImage.complete && fixedQuickViewHeight === null) {
          setHeights(firstImage.offsetHeight || firstImage.naturalHeight);
        }
      }, 500);
    }
  }
  
  setTimeout(() => {
    applyFixedQuickViewHeight();
  }, 300);
  
  
  // تهيئة Swiper للصور بعد إدراج HTML
  // نستخدم requestAnimationFrame للتأكد من أن DOM جاهز
  requestAnimationFrame(() => {
    setTimeout(() => {
      if (typeof Swiper !== 'undefined') {
        initQuickViewSwiper(hasMultipleImages);
      } else {
        console.warn('Swiper library not loaded, retrying...');
        // إعادة المحاولة بعد 500ms
        setTimeout(() => {
          if (typeof Swiper !== 'undefined') {
            initQuickViewSwiper(hasMultipleImages);
          } else {
            console.error('Swiper library not available');
          }
        }, 500);
      }
    }, 100);
  });
  
  // تهيئة خيارات المنتج
  if (optionsHTML) {
    setTimeout(() => {
      initQuickViewOptions();
    }, 100);
  }
  
  // تهيئة عداد الكمية
  setTimeout(() => {
  initQuickViewQuantity();
  }, 100);
}

function initQuickViewSwiper(hasMultipleImages = false) {
  if (typeof Swiper === 'undefined') {
    console.warn('Swiper is not loaded');
    return;
  }
  
  const swiperElement = document.querySelector('#quickview-modal-body .quickview-swiper');
  if (!swiperElement) {
    console.warn('Swiper element not found');
    return;
  }
  
  // التحقق من وجود slides
  const slides = swiperElement.querySelectorAll('.swiper-slide');
  if (slides.length === 0) {
    console.warn('No slides found in Swiper');
    return;
  }
  
  
  // تدمير أي Swiper موجود مسبقاً
  if (swiperElement.swiper) {
    try {
      swiperElement.swiper.destroy(true, true);
    } catch (e) {
      console.warn('Error destroying existing Swiper:', e);
    }
  }
  
  // التأكد من وجود الأزرار في DOM
  let nextBtn = swiperElement.querySelector('.swiper-button-next');
  let prevBtn = swiperElement.querySelector('.swiper-button-prev');
  
  // إذا لم تكن الأزرار موجودة، نضيفها
  if (!nextBtn) {
    nextBtn = document.createElement('div');
    nextBtn.className = 'swiper-button-next';
    swiperElement.appendChild(nextBtn);
  }
  if (!prevBtn) {
    prevBtn = document.createElement('div');
    prevBtn.className = 'swiper-button-prev';
    swiperElement.appendChild(prevBtn);
  }
  
  // إعدادات Swiper
  const swiperConfig = {
    slidesPerView: 1,
    spaceBetween: 0,
    speed: 400,
    allowTouchMove: true,
    keyboard: {
      enabled: true,
    },
    effect: 'slide',
    watchOverflow: true,
    watchSlidesVisibility: true,
    watchSlidesProgress: true,
    on: {
      init: function() {
        const slideCount = this.slides.length;
        
        // إخفاء الأزرار إذا كانت هناك صورة واحدة فقط
        if (slideCount <= 1) {
          if (nextBtn) {
            nextBtn.style.display = 'none';
            nextBtn.style.opacity = '0';
            nextBtn.style.pointerEvents = 'none';
          }
          if (prevBtn) {
            prevBtn.style.display = 'none';
            prevBtn.style.opacity = '0';
            prevBtn.style.pointerEvents = 'none';
          }
        } else {
          if (nextBtn) {
            nextBtn.style.display = '';
            nextBtn.style.opacity = '';
            nextBtn.style.pointerEvents = '';
          }
          if (prevBtn) {
            prevBtn.style.display = '';
            prevBtn.style.opacity = '';
            prevBtn.style.pointerEvents = '';
          }
        }
        
        // تحميل الصور
        const images = swiperElement.querySelectorAll('img[loading="lazy"]');
        images.forEach((img, index) => {
          if (index < 2) {
            // تحميل أول صورتين
            img.loading = 'eager';
          }
        });
      },
      slideChange: function() {
        // تحميل الصور القريبة
        const currentIndex = this.activeIndex;
        const slides = this.slides;
        slides.forEach((slide, index) => {
          const img = slide.querySelector('img');
          if (img && Math.abs(index - currentIndex) <= 1 && img.loading === 'lazy') {
            img.loading = 'eager';
          }
        });
      }
    }
  };
  
  // تعطيل loop دائماً
  swiperConfig.loop = false;
  
  // إضافة navigation فقط إذا كانت هناك أزرار
  if (nextBtn && prevBtn) {
    swiperConfig.navigation = {
      nextEl: nextBtn,
      prevEl: prevBtn,
    };
  }
  
  // إضافة lazy loading
  if (hasMultipleImages) {
    swiperConfig.lazy = {
      loadPrevNext: true,
      loadPrevNextAmount: 2,
    };
  }
  
  try {
    const quickViewSwiper = new Swiper(swiperElement, swiperConfig);
    
    // حفظ reference للـ Swiper instance
    swiperElement.quickViewSwiperInstance = quickViewSwiper;
    
  } catch (error) {
    console.error('Error initializing Swiper:', error);
  }
}

function quickViewOptionListItemClicked(event) {
  event.preventDefault();
  event.stopPropagation();
  
  const clickedItem = event.target.closest('li');
  if (!clickedItem) return;
  
  // منع النقر على العنصر النشط
  if (clickedItem.classList.contains('active')) {
    return;
  }
  
  const value_li = clickedItem.getAttribute('value')?.trim();
  if (!value_li) return;
  
  const parentUl = clickedItem.closest('ul');
  if (!parentUl) return;
  
  const label_name = parentUl.previousElementSibling;
  if (label_name && label_name.tagName === 'LABEL') {
    // تحديث الـ label
    const originalText = label_name.textContent.split(':')[0].trim();
    label_name.innerHTML = `${originalText}: <span>${value_li}</span>`;
  }
  
  // تفعيل الـ li مع animation
  Array.from(parentUl.children).forEach((li) => {
    li.classList.remove('active');
    li.style.transform = '';
  });
  
  clickedItem.classList.add('active');
  
  // تحديث صور المنتج بناءً على الخيارات المختارة
  updateQuickViewImages();
}

function updateQuickViewImages() {
  const modalBody = document.getElementById('quickview-modal-body');
  if (!modalBody) return;
  
  // جلب بيانات المنتج المحفوظة
  const productDataStr = modalBody.getAttribute('data-product-data');
  if (!productDataStr) return;
  
  let productData;
  try {
    productData = JSON.parse(productDataStr);
  } catch (e) {
    console.error('Error parsing product data:', e);
    return;
  }
  
  const variants = productData.variants || [];
  const options = productData.options || [];
  
  // جمع جميع الخيارات المختارة
  const selectedOptions = {};
  const optionGroups = document.querySelectorAll('#quickview-variants-options .form-group');
  
  optionGroups.forEach((group) => {
    const ul = group.querySelector('ul');
    if (ul) {
      const activeLi = ul.querySelector('li.active');
      if (activeLi) {
        const optionIndex = parseInt(ul.getAttribute('index'));
        const value = activeLi.getAttribute('value');
        if (!isNaN(optionIndex) && value) {
          selectedOptions[optionIndex] = value;
        }
      }
    }
  });
  
  // البحث عن variant يطابق جميع الخيارات المختارة
  let matchingVariant = null;
  for (const variant of variants) {
    if (variant.unavailable) continue;
    if (!variant.attributes || variant.attributes.length !== options.length) continue;
    
    let matches = true;
    for (let i = 0; i < options.length; i++) {
      const selectedValue = selectedOptions[i];
      if (selectedValue && variant.attributes[i]) {
        const attrValue = variant.attributes[i].value || variant.attributes[i].name;
        if (attrValue !== selectedValue) {
          matches = false;
          break;
        }
      }
    }
    
    if (matches) {
      matchingVariant = variant;
      break;
    }
  }
  
  // تحديث الصور إذا تم العثور على variant مطابق
  if (matchingVariant) {
    let variantImages = [];
    
    if (matchingVariant.images && matchingVariant.images.length > 0) {
      variantImages = matchingVariant.images.map(img => {
        return (img.image && (img.image.full_size || img.image.medium || img.image.small)) ||
               (img.full_size || img.medium || img.small) ||
               (typeof img === 'string' ? img : '');
      }).filter(img => img);
    } else if (matchingVariant.main_image) {
      const mainImg = (matchingVariant.main_image.image && (matchingVariant.main_image.image.full_size || matchingVariant.main_image.image.medium || matchingVariant.main_image.image.small)) ||
                     (matchingVariant.main_image.full_size || matchingVariant.main_image.medium || matchingVariant.main_image.small) ||
                     (typeof matchingVariant.main_image === 'string' ? matchingVariant.main_image : '');
      if (mainImg) {
        variantImages.push(mainImg);
      }
    }
    
    if (variantImages.length > 0) {
      const swiperElement = document.querySelector('#quickview-modal-body .quickview-swiper');
      if (swiperElement && swiperElement.swiper) {
        const swiper = swiperElement.swiper;
        const firstNewImage = variantImages[0];
        const firstCurrentSlide = swiper.slides[0];
        const firstCurrentImg = firstCurrentSlide ? firstCurrentSlide.querySelector('img') : null;
        const firstCurrentSrc = firstCurrentImg ? firstCurrentImg.src : '';
        
        // إذا كانت الصورة الأولى مختلفة، نحدث جميع الصور
        if (firstCurrentSrc !== firstNewImage) {
          // الحصول على الارتفاع المحفوظ (الذي تم حفظه أول مرة فقط)
          const fixedHeight = swiperElement.getAttribute('data-fixed-height');
          let savedHeight = null;
          
          if (fixedHeight) {
            savedHeight = parseInt(fixedHeight);
          } else {
            // إذا لم يكن محفوظاً، نحاول الحصول عليه من container
            savedHeight = swiperElement.offsetHeight;
          }
          
          // تطبيق الارتفاع المحفوظ (لا نغيره، فقط نحافظ عليه)
          if (savedHeight && savedHeight > 0) {
            const px = savedHeight + 'px';
            swiperElement.style.height = px;
            swiperElement.style.minHeight = px;
          }
          
          // إنشاء slides جديدة
          const newSlidesHTML = variantImages.map((imgSrc, index) => {
            const loadingAttr = index === 0 ? 'eager' : 'lazy';
            return `
              <div class="swiper-slide">
                <img src="${imgSrc}" alt="" class="img-fluid" loading="${loadingAttr}" ${index === 0 ? 'fetchpriority="high"' : ''}>
              </div>
            `;
          }).join('');
          
          // تدمير Swiper أولاً
          swiper.destroy(true, true);
          
          // الحفاظ على الارتفاع (لا نغيره)
          if (savedHeight && savedHeight > 0) {
            const px = savedHeight + 'px';
            swiperElement.style.height = px;
            swiperElement.style.minHeight = px;
          }
          
          // استبدال محتوى swiper-wrapper بعد التدمير
          const wrapper = swiperElement.querySelector('.swiper-wrapper');
          if (wrapper) {
            wrapper.innerHTML = newSlidesHTML;
            // تطبيق الارتفاع على wrapper و slides
            if (savedHeight && savedHeight > 0) {
              const px = savedHeight + 'px';
              wrapper.style.height = px;
              const slides = wrapper.querySelectorAll('.swiper-slide');
              slides.forEach(slide => {
                slide.style.height = px;
              });
            }
          }
          
          // الحفاظ على الارتفاع بعد استبدال المحتوى
          if (savedHeight && savedHeight > 0) {
            const px = savedHeight + 'px';
            swiperElement.style.height = px;
            swiperElement.style.minHeight = px;
          }
          
          setTimeout(() => {
            // التأكد من وجود الأزرار في DOM
            let nextBtn = swiperElement.querySelector('.swiper-button-next');
            let prevBtn = swiperElement.querySelector('.swiper-button-prev');
            
            // إذا لم تكن الأزرار موجودة، نضيفها
            if (!nextBtn) {
              nextBtn = document.createElement('div');
              nextBtn.className = 'swiper-button-next';
              swiperElement.appendChild(nextBtn);
            }
            if (!prevBtn) {
              prevBtn = document.createElement('div');
              prevBtn.className = 'swiper-button-prev';
              swiperElement.appendChild(prevBtn);
            }
            
            // الحفاظ على الارتفاع قبل وبعد التهيئة (لا نغيره)
            if (savedHeight && savedHeight > 0) {
              const px = savedHeight + 'px';
              swiperElement.style.height = px;
              swiperElement.style.minHeight = px;
              const wrapper = swiperElement.querySelector('.swiper-wrapper');
              if (wrapper) wrapper.style.height = px;
              const slides = swiperElement.querySelectorAll('.swiper-slide');
              slides.forEach(slide => {
                slide.style.height = px;
              });
            }
            
            // إعادة تهيئة Swiper
            const hasMultiple = variantImages.length > 1;
            initQuickViewSwiper(hasMultiple);
            
            // الحفاظ على الارتفاع بعد التهيئة (لا نغيره)
            if (savedHeight && savedHeight > 0) {
              const px = savedHeight + 'px';
              swiperElement.style.height = px;
              swiperElement.style.minHeight = px;
              const wrapper = swiperElement.querySelector('.swiper-wrapper');
              if (wrapper) wrapper.style.height = px;
              const slides = swiperElement.querySelectorAll('.swiper-slide');
              slides.forEach(slide => {
                slide.style.height = px;
              });
            }
            
            // إظهار/إخفاء الأزرار بعد التهيئة مباشرة
            setTimeout(() => {
              const swiperInstance = swiperElement.swiper;
              const nextBtnAfterInit = swiperElement.querySelector('.swiper-button-next');
              const prevBtnAfterInit = swiperElement.querySelector('.swiper-button-prev');
              
              
              if (hasMultiple) {
                if (nextBtnAfterInit) {
                  nextBtnAfterInit.style.display = '';
                  nextBtnAfterInit.style.opacity = '1';
                  nextBtnAfterInit.style.visibility = 'visible';
                  nextBtnAfterInit.style.pointerEvents = 'auto';
                  nextBtnAfterInit.classList.remove('swiper-button-disabled');
                }
                if (prevBtnAfterInit) {
                  prevBtnAfterInit.style.display = '';
                  prevBtnAfterInit.style.opacity = '1';
                  prevBtnAfterInit.style.visibility = 'visible';
                  prevBtnAfterInit.style.pointerEvents = 'auto';
                  prevBtnAfterInit.classList.remove('swiper-button-disabled');
                }
              } else {
                if (nextBtnAfterInit) {
                  nextBtnAfterInit.style.display = 'none';
                  nextBtnAfterInit.style.opacity = '0';
                  nextBtnAfterInit.style.visibility = 'hidden';
                  nextBtnAfterInit.style.pointerEvents = 'none';
                }
                if (prevBtnAfterInit) {
                  prevBtnAfterInit.style.display = 'none';
                  prevBtnAfterInit.style.opacity = '0';
                  prevBtnAfterInit.style.visibility = 'hidden';
                  prevBtnAfterInit.style.pointerEvents = 'none';
                }
              }
            }, 150);
            
            // لا نحدث الارتفاع بعد تحميل الصور - نحافظ على الارتفاع الأول فقط
            // مثل صفحة المنتج: fixedMediaHeight يتم حفظه مرة واحدة ولا يتغير
          }, 50);
        }
      }
    }
  }
}

function initQuickViewOptions() {
  // ربط الأحداث للخيارات
  const listItems = document.querySelectorAll('#quickview-variants-options li');
  listItems.forEach((li) => {
    // إضافة event listener
    li.addEventListener('click', quickViewOptionListItemClicked);
    
  });
  
  // تفعيل الاختيار النشط افتراضياً - تحديث الـ labels
  const optionGroups = document.querySelectorAll('#quickview-variants-options .form-group');
  optionGroups.forEach((group) => {
    const ul = group.querySelector('ul');
    const label = group.querySelector('label');
    if (ul && label) {
      const activeLi = ul.querySelector('li.active');
      if (activeLi) {
        const value = activeLi.getAttribute('value');
        const originalText = label.textContent.split(':')[0].trim();
        label.innerHTML = `${originalText}: <span>${value}</span>`;
      }
      
    }
  });
}

function initQuickViewQuantity() {
  // إزالة event listeners السابقة لتجنب التكرار
  $('.increase-quantity-quickview').off('click').on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const input = $('#quickview-quantity-input');
    const currentVal = parseInt(input.val()) || 1;
    const maxVal = parseInt(input.attr('max')) || 100;
    
    if (currentVal < maxVal) {
      input.val(currentVal + 1);
      // إضافة animation feedback
      $(this).addClass('clicked');
      setTimeout(() => {
        $(this).removeClass('clicked');
      }, 200);
    } else {
      // إضافة feedback عند الوصول للحد الأقصى
      input.addClass('shake');
      setTimeout(() => {
        input.removeClass('shake');
      }, 500);
    }
  });
  
  $('.decrease-quantity-quickview').off('click').on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const input = $('#quickview-quantity-input');
    const currentVal = parseInt(input.val()) || 1;
    const minVal = parseInt(input.attr('min')) || 1;
    
    if (currentVal > minVal) {
      input.val(currentVal - 1);
      // إضافة animation feedback
      $(this).addClass('clicked');
      setTimeout(() => {
        $(this).removeClass('clicked');
      }, 200);
    } else {
      // إضافة feedback عند الوصول للحد الأدنى
      input.addClass('shake');
      setTimeout(() => {
        input.removeClass('shake');
      }, 500);
    }
  });
  
  // منع الكتابة المباشرة في input
  $('#quickview-quantity-input').on('keydown', function(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
      e.preventDefault();
    }
  });
  
  // التحقق من القيمة عند blur
  $('#quickview-quantity-input').on('blur', function() {
    const input = $(this);
    const currentVal = parseInt(input.val()) || 1;
    const minVal = parseInt(input.attr('min')) || 1;
    const maxVal = parseInt(input.attr('max')) || 100;
    
    if (currentVal < minVal) {
      input.val(minVal);
    } else if (currentVal > maxVal) {
      input.val(maxVal);
    }
  });
}

function addToCartFromQuickView(productId) {
  const btn = $('.btn-add-to-cart-quickview');
  const progress = btn.find('.add-to-cart-progress');
  
  if (!progress.hasClass('d-none')) return;
  
  progress.removeClass('d-none');
  btn.prop('disabled', true);
  
  const form = document.getElementById('quickview-product-form');
  if (!form) {
    progress.addClass('d-none');
    btn.prop('disabled', false);
    return;
  }
  
  // جمع بيانات الخيارات المختارة لتحديد variant_id
  const modalBody = document.getElementById('quickview-modal-body');
  const productDataStr = modalBody ? modalBody.getAttribute('data-product-data') : null;
  let productData = null;
  if (productDataStr) {
    try {
      productData = JSON.parse(productDataStr);
    } catch (e) {
      console.error('Error parsing product data:', e);
    }
  }
  
  // تحديد variant_id من الخيارات المختارة (مثل updateQuickViewImages)
  let selectedVariantId = null;
  if (productData && productData.variants && productData.options) {
    const variants = productData.variants;
    const options = productData.options;
    const selectedOptions = {};
    
    const optionGroups = document.querySelectorAll('#quickview-variants-options .form-group');
    optionGroups.forEach((group) => {
      const ul = group.querySelector('ul');
      if (ul) {
        const activeLi = ul.querySelector('li.active');
        if (activeLi) {
          const optionIndex = parseInt(ul.getAttribute('index'));
          const value = activeLi.getAttribute('value');
          if (!isNaN(optionIndex) && value) {
            selectedOptions[optionIndex] = value;
          }
        }
      }
    });
    
    // البحث عن variant يطابق جميع الخيارات المختارة
    for (const variant of variants) {
      if (variant.unavailable) continue;
      if (!variant.attributes || variant.attributes.length !== options.length) continue;
      
      let matches = true;
      for (let i = 0; i < options.length; i++) {
        const selectedValue = selectedOptions[i];
        if (selectedValue && variant.attributes[i]) {
          const attrValue = variant.attributes[i].value || variant.attributes[i].name;
          if (attrValue !== selectedValue) {
            matches = false;
            break;
          }
        }
      }
      
      if (matches) {
        selectedVariantId = variant.id;
        break;
      }
    }
  }
  
  // إذا لم نجد variant_id من المطابقة، نحاول الحصول عليه من أول li نشط
  if (!selectedVariantId) {
    const firstActiveLi = document.querySelector('#quickview-variants-options li.active');
    if (firstActiveLi) {
      const variantIdFromLi = firstActiveLi.getAttribute('data-variant-id');
      if (variantIdFromLi) {
        selectedVariantId = variantIdFromLi;
      }
    }
  }
  
  // إزالة hidden inputs القديمة
  form.querySelectorAll('input[type="hidden"][name^="option_"], input[type="hidden"][name="quantity"]').forEach(input => input.remove());
  
  // تحديث product-id input (استخدام variant_id إذا كان متوفراً، وإلا product_id)
  // مثل product card: استخدام variant_id كـ product_id عند وجود خيارات
  const productIdInput = form.querySelector('#product-id');
  const finalProductId = selectedVariantId || productId;
  
  if (productIdInput) {
    productIdInput.value = finalProductId;
  } else {
    const newProductIdInput = document.createElement('input');
    newProductIdInput.type = 'hidden';
    newProductIdInput.id = 'product-id';
    newProductIdInput.name = 'product_id';
    newProductIdInput.value = finalProductId;
    form.appendChild(newProductIdInput);
  }
  
  // إضافة hidden inputs للخيارات المختارة في الـ form
  const optionsContainer = document.getElementById('quickview-variants-options');
  if (optionsContainer) {
    const optionGroups = optionsContainer.querySelectorAll('.form-group');
    optionGroups.forEach((group) => {
      const ul = group.querySelector('ul');
      if (ul) {
        const activeLi = ul.querySelector('li.active');
        if (activeLi) {
          const optionId = ul.getAttribute('data-option-id');
          const value = activeLi.getAttribute('value');
          
          if (optionId && value) {
            // إضافة hidden input للخيار
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = `option_${optionId}`;
            hiddenInput.value = value;
            form.appendChild(hiddenInput);
          }
        }
      }
    });
  }
  
  // إضافة hidden input للكمية
  let quantityInput = form.querySelector('input[name="quantity"]');
  if (!quantityInput) {
    quantityInput = document.createElement('input');
    quantityInput.type = 'hidden';
    quantityInput.name = 'quantity';
    form.appendChild(quantityInput);
  }
  const quantity = parseInt($('#quickview-quantity-input').val()) || 1;
  quantityInput.value = quantity;
  
  // التحقق من صحة الـ form
  if (form && !form.checkValidity()) {
    form.querySelectorAll(':invalid').forEach(el => {
      el.classList.add('is-invalid');
    });
    progress.addClass('d-none');
    btn.prop('disabled', false);
    if (typeof toastr !== 'undefined') {
      toastr.error('الرجاء تعبئة الحقول المطلوبة بشكل صحيح.');
    }
    const firstInvalid = form.querySelector(':invalid');
    if (firstInvalid) firstInvalid.focus();
    return;
  }
  
  // إضافة المنتج للسلة باستخدام form_id (مثل صفحة المنتج)
  if (window.zid && window.zid.cart && window.zid.cart.addProduct) {
    window.zid.cart.addProduct({ form_id: 'quickview-product-form' }, { showErrorNotification: true })
      .then(function(response) {
        if (response) {
          // تحديث السلة
          if (typeof setCartTotalAndBadge === 'function') {
            setCartTotalAndBadge(response);
          }
          if (typeof fetchCart === 'function') {
            fetchCart();
          }
          if (typeof showCartPopupAfterAdd === 'function') {
            showCartPopupAfterAdd();
          }
          
          // إظهار رسالة نجاح
          if (typeof window.loadToasterScriptIfNotLoaded === 'function') {
            window.loadToasterScriptIfNotLoaded(function() {
              toastr.success(window.i18n?.add_to_cart || 'تم إضافة المنتج إلى السلة بنجاح');
            });
          }
          
          // إغلاق الـ modal
          const modal = bootstrap.Modal.getInstance(document.getElementById('quickview-modal'));
          if (modal) {
            modal.hide();
          }
          
          // لا نفتح القائمة الجانبية (تم إزالتها حسب طلب المستخدم)
        }
      })
      .catch(function(error) {
        console.error('Error adding to cart:', error);
      })
      .finally(function() {
        progress.addClass('d-none');
        btn.prop('disabled', false);
      });
  }
}

// دالة إغلاق المودال
function closeQuickView() {
  const modalElement = document.getElementById('quickview-modal');
  if (modalElement) {
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
      modal.hide();
    }
  }
}