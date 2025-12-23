// Quickview Modal Functions
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
      
      // محاولة استخراج المنتج من هيكل البيانات المختلف
      if (data && data.product) {
        product = data.product;
      } else if (data && data.data && data.data.product) {
        product = data.data.product;
      } else if (data && data.id) {
        product = data;
      }
      
      if (product) {
        renderQuickView(product, productSlug);
      } else {
        console.error('Product data not found in response:', data);
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

function renderQuickView(product, productSlug) {
  console.log('Rendering product:', product);
  const modalBody = document.getElementById('quickview-modal-body');
  
  if (!modalBody) {
    console.error('Modal body not found');
    return;
  }
  
  // بناء صور المنتج
  let imagesHTML = '';
  if (product.images && product.images.length > 0) {
    imagesHTML = product.images.map((img, index) => {
      const imgSrc = (img.image && (img.image.medium || img.image.small)) || 
                     (img.medium || img.small) || 
                     (typeof img === 'string' ? img : '');
      return `
        <div class="quickview-image-item ${index === 0 ? 'active' : ''}">
          <img src="${imgSrc}" alt="${product.name || ''}" class="img-fluid">
        </div>
      `;
    }).join('');
  } else if (product.main_image) {
    const imgSrc = (product.main_image.image && (product.main_image.image.medium || product.main_image.image.small)) ||
                   (product.main_image.medium || product.main_image.small) ||
                   (typeof product.main_image === 'string' ? product.main_image : '');
    imagesHTML = `
      <div class="quickview-image-item active">
        <img src="${imgSrc}" alt="${product.name || ''}" class="img-fluid">
      </div>
    `;
  } else {
    imagesHTML = `
      <div class="quickview-image-item active">
        <img src="${window.asset_url || ''}product-img.svg" alt="${product.name || ''}" class="img-fluid">
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
  
  // بناء خيارات المنتج
  let optionsHTML = '';
  
  // إذا كان المنتج يحتوي على options (variants)
  if (product.options && product.options.length > 0) {
    optionsHTML = product.options.map((option, optionIndex) => {
      // جمع القيم الفريدة من variants لهذا الـ option
      const optionValues = [];
      const seenValues = new Set();
      
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          if (!variant.unavailable && variant.attributes && variant.attributes[optionIndex]) {
            const attr = variant.attributes[optionIndex];
            const valueId = attr.option_value_id || attr.id || attr.value_id;
            const valueName = attr.value || attr.name;
            
            if (valueId && valueName && !seenValues.has(valueId)) {
              seenValues.add(valueId);
              optionValues.push({
                id: valueId,
                name: valueName
              });
            }
          }
        });
      }
      
      if (optionValues.length === 0) {
        return '';
      }
      
      const optionsList = optionValues.map(opt => 
        `<option value="${opt.id}">${opt.name}</option>`
      ).join('');
      
      return `
        <div class="form-group mb-3">
          <label>${option.name}</label>
          <select class="form-control quickview-variant-select" data-option-id="${option.id}" name="option_${option.id}">
            <option value="">اختر ${option.name}</option>
            ${optionsList}
          </select>
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
            <div class="quickview-main-image">
              ${imagesHTML}
            </div>
            ${product.images && product.images.length > 1 ? `
              <div class="quickview-thumbnails">
                ${product.images.map((img, index) => {
                  const thumbSrc = (img.image && img.image.small) || (img.small) || (typeof img === 'string' ? img : '');
                  return `
                    <div class="quickview-thumb ${index === 0 ? 'active' : ''}" data-index="${index}">
                      <img src="${thumbSrc}" alt="${product.name || ''}">
                    </div>
                  `;
                }).join('')}
              </div>
            ` : ''}
          </div>
        </div>
        <div class="col-md-6">
          <div class="quickview-content">
            <h2 class="quickview-title">${product.name || 'منتج'}</h2>
            ${priceHTML}
            
            ${product.short_description ? `
              <div class="quickview-description">
                <p>${product.short_description}</p>
              </div>
            ` : ''}
            
            ${optionsHTML ? `
              <div class="quickview-options">
                <form id="quickview-product-form">
                  ${optionsHTML}
                </form>
              </div>
            ` : ''}
            
            <div class="quickview-quantity mb-3">
              <label>الكمية</label>
              <div class="quantity-input d-inline-flex align-items-center">
                <button type="button" class="btn-quantity decrease-quantity-quickview" aria-label="decrease">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none">
                    <path d="M20 12L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <input type="number" id="quickview-quantity-input" class="product-quantity-input" value="1" min="1" max="${(currentProduct.is_infinite === false && currentProduct.quantity) ? currentProduct.quantity : (product.is_infinite === false && product.quantity) ? product.quantity : 100}" readonly>
                <button type="button" class="btn-quantity increase-quantity-quickview" aria-label="increase">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none">
                    <path d="M12 4V20M20 12H4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
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
  console.log('Modal HTML rendered successfully');
  
  // تهيئة الصور المصغرة
  if (product.images && product.images.length > 1) {
    initQuickViewThumbnails();
  }
  
  // تهيئة عداد الكمية
  initQuickViewQuantity();
}

function initQuickViewThumbnails() {
  $('.quickview-thumb').on('click', function() {
    const index = $(this).data('index');
    $('.quickview-thumb').removeClass('active');
    $(this).addClass('active');
    $('.quickview-image-item').removeClass('active');
    $('.quickview-image-item').eq(index).addClass('active');
  });
}

function initQuickViewQuantity() {
  $('.increase-quantity-quickview').on('click', function() {
    const input = $('#quickview-quantity-input');
    const currentVal = parseInt(input.val()) || 1;
    const maxVal = parseInt(input.attr('max')) || 100;
    if (currentVal < maxVal) {
      input.val(currentVal + 1);
    }
  });
  
  $('.decrease-quantity-quickview').on('click', function() {
    const input = $('#quickview-quantity-input');
    const currentVal = parseInt(input.val()) || 1;
    const minVal = parseInt(input.attr('min')) || 1;
    if (currentVal > minVal) {
      input.val(currentVal - 1);
    }
  });
}

function addToCartFromQuickView(productId) {
  const btn = $('.btn-add-to-cart-quickview');
  const progress = btn.find('.add-to-cart-progress');
  
  if (!progress.hasClass('d-none')) return;
  
  progress.removeClass('d-none');
  btn.prop('disabled', true);
  
  // جمع بيانات الخيارات والحقول
  const formData = {};
  const form = document.getElementById('quickview-product-form');
  
  if (form) {
    const formElements = form.elements;
    for (let i = 0; i < formElements.length; i++) {
      const element = formElements[i];
      if (element.name && element.value) {
        if (element.name.startsWith('option_')) {
          if (!formData.options) formData.options = {};
          const optionId = element.name.replace('option_', '');
          formData.options[optionId] = element.value;
        } else if (element.name.startsWith('field_')) {
          if (!formData.fields) formData.fields = {};
          const fieldId = element.name.replace('field_', '');
          formData.fields[fieldId] = element.value;
        }
      }
    }
  }
  
  // الحصول على الكمية
  const quantity = parseInt($('#quickview-quantity-input').val()) || 1;
  
  // إعداد payload
  const payload = {
    product_id: productId,
    quantity: quantity
  };
  
  if (formData.options) {
    payload.options = formData.options;
  }
  
  if (formData.fields) {
    payload.fields = formData.fields;
  }
  
  // إضافة المنتج للسلة
  if (window.zid && window.zid.cart && window.zid.cart.addProduct) {
    window.zid.cart.addProduct(payload, { showErrorNotification: true })
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
          
          // فتح السلة الجانبية إذا كانت متاحة
          const sideCart = document.getElementById('side-cart');
          if (sideCart && (window.SHOW_SIDE_CART !== false)) {
            new bootstrap.Offcanvas(sideCart).show();
          }
        }
      })
      .catch(function(error) {
        console.error('Error adding to cart:', error);
      })
      .finally(function() {
        progress.addClass('d-none');
        btn.prop('disabled', false);
      });
  } else {
    progress.addClass('d-none');
    btn.prop('disabled', false);
  }
}

