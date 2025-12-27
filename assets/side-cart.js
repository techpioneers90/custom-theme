document.addEventListener("DOMContentLoaded", () => {
  fetchCart();
  const myOffcanvas = document.getElementById('side-cart');

  if (myOffcanvas) {
    myOffcanvas.addEventListener('hidden.bs.offcanvas', () => {
      $('.item-inside-cart').html('');
      $('.loading-cart').removeClass('d-none');
      $('.footer-side-cart').addClass('d-none');
      $('.btn-close-offcanvas').addClass('d-none');
    });

    myOffcanvas.addEventListener('show.bs.offcanvas', () => {
      $('.loading-cart').addClass('d-none');
      fetchCart();
    });
  }
});

function productCartAddToCart(elm, product_id) {
  const $elm = $(elm);
  
  // تحقق من وجود loader أو spinner
  if ($elm.find('.spinner-border').length > 0) return;
  
  $('.loading-cart').removeClass('d-none');
  const originalHtml = $elm.html();
  
  $elm.html(`<div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div>`);

  // الحصول على الكمية من العداد
  var quantityInput = $('.product-card-quantity-input[data-product-id="' + product_id + '"]');
  var quantity = 1;
  
  if (quantityInput.length) {
    var inputValue = quantityInput.val();
    quantity = parseInt(inputValue, 10);
    if (isNaN(quantity) || quantity < 1) {
      quantity = 1;
    }
  } else {
    // إذا لم نجد باستخدام data-product-id، نبحث في نفس الـ wrapper
    var $wrapper = $(elm).closest('.product-card-quantity-wrapper');
    if ($wrapper.length) {
      quantityInput = $wrapper.find('.product-card-quantity-input');
      if (quantityInput.length) {
        var inputValue = quantityInput.val();
        quantity = parseInt(inputValue, 10);
        if (isNaN(quantity) || quantity < 1) {
          quantity = 1;
        }
      }
    }
  }

  addToCart(product_id, quantity, () => {
    $elm.html(originalHtml);
    
    // التبديل بين footer-btns وخيار الكمية
    var $addToCartBtn = $('.product-card-add-to-cart[data-product-id="' + product_id + '"]');
    var $footerBtns = $addToCartBtn.closest('.footer-btns');
    var $quantityWrapper = $('.product-card-quantity-wrapper[data-product-id="' + product_id + '"]');
    
    if ($footerBtns.length && $quantityWrapper.length) {
      // إخفاء footer-btns بالكامل وإظهار خيار الكمية
      $footerBtns.addClass('d-none');
      $quantityWrapper.removeClass('d-none').addClass('active');
      
      // تعيين الكمية إلى 1 في input
      var $qtyInput = $quantityWrapper.find('.product-card-quantity-input');
      if ($qtyInput.length) {
        $qtyInput.val(1);
      }
    }
    
    // إعادة تعيين الكمية إلى 1 بعد الإضافة (للحالات القديمة)
    if (quantityInput && quantityInput.length) {
      quantityInput.val(1);
    }
  });
}

function addToCart(product_id, quantity, onCompleted) {
  
  zid.cart
    .addProduct({ 
      product_id: product_id,
      quantity: quantity
    }, { showErrorNotification: true })
    .then(function (response) {
      
      if (response) {
        if (typeof window.loadToasterScriptIfNotLoaded === 'function') {
          window.loadToasterScriptIfNotLoaded(function () {
            toastr.success("تم إضافة المنتج إلى السلة بنجاح");
          });
        }
        
        // تحديث السلة والعداد
        setCartTotalAndBadge(response);
        fetchCart();
        
        if (typeof showCartPopupAfterAdd === 'function') {
          showCartPopupAfterAdd();
        }
        
        if (onCompleted) {
          onCompleted();
        }
      }
    })
    .catch(err => {
      if (onCompleted) onCompleted();
    });
}

function setCartTotalAndBadge(cart) {  
  // التعامل مع البنيتين: القديمة (response.data.cart) والجديدة (response مباشرة)
  const actualCart = cart?.data?.cart || cart;
  
  if (actualCart && actualCart.products_count !== undefined) {
    setCartBadge(actualCart.products_count);
  }
  
  const cartTotal = getCartTotal(actualCart);
  if (cartTotal) {
    setCartIconTotal(cartTotal);
  }
}

function setCartIconTotal(total) {
  $('.cart-price').html(total).removeClass('d-none');
}

function setCartBadge(badge) {
  $('.cart-badge').html(badge);
  $('.cart-count').html(badge);
}

function displayActivePaymentSessionBar(cart) {
  if (cart && cart.is_reserved !== undefined) {
    $('.payment-session-bar').toggleClass('d-none', !cart.is_reserved);
  }
}

function getCartTotal(cart) {
  if (!cart || !cart.totals) return null;
  const totalItem = cart.totals.find(total => total.code === 'total');
  return totalItem?.value_string || null;
}

function createCartProduct(product) {
  if (!product || !product.images || !product.images[0]) {
    return '';
  }

  const oldPrice = product.price_before_string
    ? `<span class="price-discount"><span class="price">${product.price_string}</span><del class="old">${product.price_before_string}</del></span>`
    : `<span class="product-price">${product.price_string}</span>`;
  const imageUrl = product.images[0].origin;

  return `
    <li id="product_${product.id}">
      <div class="flex-product-box">
        <div class="img-product-box">
          <a href="${product.url}"><img src="${imageUrl}" alt="${product.name}"></a>
        </div>
        <div class="product-info-box">
          <button class="remove" onclick="return removeItem('${product.id}', this)" type="button">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
                <path d="M19.5 5.5L18.8803 15.5251C18.7219 18.0864 18.6428 19.3671 18.0008 20.2879C17.6833 20.7431 17.2747 21.1273 16.8007 21.416C15.8421 22 14.559 22 11.9927 22C9.42312 22 8.1383 22 7.17905 21.4149C6.7048 21.1257 6.296 20.7408 5.97868 20.2848C5.33688 19.3626 5.25945 18.0801 5.10461 15.5152L4.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path d="M3 5.5H21M16.0557 5.5L15.3731 4.09173C14.9196 3.15626 14.6928 2.68852 14.3017 2.39681C14.215 2.3321 14.1231 2.27454 14.027 2.2247C13.5939 2 13.0741 2 12.0345 2C10.9688 2 10.436 2 9.99568 2.23412C9.8981 2.28601 9.80498 2.3459 9.71729 2.41317C9.32164 2.7167 9.10063 3.20155 8.65861 4.17126L8.05292 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path d="M9.5 16.5L9.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path d="M14.5 16.5L14.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>
          <h4 class="title-product-m">${product.name}</h4>
          <div class="price-old-new">
            <div class="price">${oldPrice}</div>
          </div>
          <div class="block-p-qty">
            <button class="button-plus btn-number" type="button" data-type="plus" data-field="quantity_${product.id}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#ffffff" fill="none">
                <path d="M12 4V20M20 12H4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            </button>
            <input type="text" name="quantity_${product.id}" min="1" max="100" class="input-number" value="${product.quantity}" onchange="updateMiniCartProduct('${product.id}', this.value)" readonly>
            <button class="button-minus btn-number" data-type="minus" data-field="quantity_${product.id}" type="button">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#ffffff" fill="none">
                  <path d="M20 12L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </li>`;
}

function createCartProductBundle(item) {
  if (!item.product_x || !item.product_y) return '';
  return [...item.product_x, ...item.product_y].map(createCartProduct).join('');
}

// وظيفة للتحقق من المنتجات المحذوفة من السلة وإرجاع زر "أضف للسلة"
function checkAndRestoreAddToCartButtons(cartResponse) {
  // الحصول على قائمة المنتجات في السلة
  let products = [];
  if (cartResponse) {
    if (cartResponse.data) {
      if (cartResponse.data.cart && cartResponse.data.cart.products) {
        products = cartResponse.data.cart.products;
      } else if (cartResponse.data.products) {
        products = cartResponse.data.products;
      } else if (Array.isArray(cartResponse.data)) {
        products = cartResponse.data;
      }
    } else if (cartResponse.cart && cartResponse.cart.products) {
      products = cartResponse.cart.products;
    } else if (cartResponse.products) {
      products = cartResponse.products;
    } else if (Array.isArray(cartResponse)) {
      products = cartResponse;
    }
  }
  
  // جمع جميع product_id الموجودة في السلة (بدون شرطات)
  const productsInCart = new Set();
  products.forEach(item => {
    if (item.product_id) {
      productsInCart.add(String(item.product_id).replace(/-/g, ''));
    }
  });
  
  // البحث عن جميع بطاقات المنتجات التي لديها خيار كمية ظاهر
  $('.product-card-quantity-wrapper:not(.d-none)').each(function() {
    const $quantityWrapper = $(this);
    const productId = $quantityWrapper.attr('data-product-id');
    
    if (productId) {
      const normalizedProductId = String(productId).replace(/-/g, '');
      const isInCart = Array.from(productsInCart).some(cartProductId => 
        String(cartProductId).replace(/-/g, '') === normalizedProductId
      );
      
      // إذا لم يكن المنتج في السلة، نبدل بين العنصرين: نرجع footer-btns ونخفي خيار الكمية
      if (!isInCart) {
        const $addToCartBtn = $('.product-card-add-to-cart[data-product-id="' + productId + '"]');
        const $footerBtns = $addToCartBtn.closest('.footer-btns');
        if ($footerBtns.length && $quantityWrapper.length) {
          // إظهار footer-btns بالكامل وإخفاء خيار الكمية
          $footerBtns.removeClass('d-none');
          $quantityWrapper.addClass('d-none').removeClass('active');
          $quantityWrapper.find('.product-card-quantity-input').val(1);
        }
      }
    }
  });
}

function fetchCart() {
  return new Promise((resolve, reject) => {
    $('.loading-cart').removeClass('d-none');
    $('.cart-rules').addClass('d-none');
    $('#additional-cart').html('');
    $('.side-cart-items').removeClass('d-none');
    const emptyText = $('#side-cart').data('empty') || 'السلة فارغة';

    zid.cart.get().then(response => {
      // التحقق من المنتجات المحذوفة من السلة وإرجاع زر "أضف للسلة"
      checkAndRestoreAddToCartButtons(response);
      
      if (!response) {
        reject(response);
        return;
      }

      // الـ response هو الـ cart مباشرة مش جوا data.cart
      const cart = response;
      let itemsHtml = '';
      let totalsHtml = '';

      // تحديث عداد السلة
      if (cart.products_count !== undefined) {
        $('.cart-count').html(cart.products_count);
        $('.cart-badge').html(cart.products_count);
      }

      if (cart.products_count > 0 && cart.products && cart.products.length > 0) {
        
        cart.products.forEach(product => {
          const html = product.bundle_name ? createCartProductBundle(product) : createCartProduct(product);
          if (html) itemsHtml += html;
        });

        // حساب إجمالي الخصم للمنتجات
        let discountTotal = 0;
        cart.products.forEach(product => {
          if (product.price_before && product.price_before > product.price) {
            discountTotal += (product.price_before - product.price) * product.quantity;
          }
        });

        // البحث عن خصم الكوبون أو الخصومات الأخرى
        let couponDiscount = 0;
        if (cart.totals) {
          cart.totals.forEach(total => {
            if (
              total.code === 'coupon' || 
              total.code === 'discount' || 
              total.title.toLowerCase().includes('خصم') || 
              total.title.toLowerCase().includes('discount')
            ) {
              let cleanValue = parseFloat(total.value_string.replace(/[^\d.-]/g, ''));
              if (!isNaN(cleanValue)) {
                couponDiscount += Math.abs(cleanValue);
              }
            }
          });
        }

        // إجمالي كل الخصومات
        let totalDiscounts = discountTotal + couponDiscount;

        // بناء عناصر الإجماليات
        if (cart.totals) {
          cart.totals.forEach(total => {
            if (total.code === 'total' && totalDiscounts > 0) {
              let currency = cart.currency?.cart_currency?.symbol || '';
              totalsHtml += `
                <li id="discount_total" class="d-flex justify-content-between">
                  <span class="title">${rtl_mode ? 'إجمالي الخصومات' : 'Total Discounts'}</span>
                  <span class="number">-${totalDiscounts.toFixed(2)} ${currency}</span>
                </li>`;
            }

            totalsHtml += `
              <li id="${total.code}" class="d-flex justify-content-between">
                <span class="title">${total.title}</span>
                <span class="number">${total.value_string}</span>
              </li>`;
          });
        }

        $('#cart-side-totals').html(totalsHtml);
        $('.side-cart-items').html(itemsHtml);
        $('.footer-side-cart').removeClass('d-none');
        $('.btn-close-offcanvas').removeClass('d-none');
      } else {
        $('#additional-cart').html(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" color="#ffffff" fill="none">
                  <path d="M8 16H15.2632C19.7508 16 20.4333 13.1808 21.261 9.06908C21.4998 7.88311 21.6192 7.29013 21.3321 6.89507C21.045 6.5 20.4947 6.5 19.3941 6.5H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                  <path d="M8 16L5.37873 3.51493C5.15615 2.62459 4.35618 2 3.43845 2H2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                  <path d="M8.88 16H8.46857C7.10522 16 6 17.1513 6 18.5714C6 18.8081 6.1842 19 6.41143 19H17.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  <circle cx="10.5" cy="20.5" r="1.5" stroke="currentColor" stroke-width="1.5" />
                  <circle cx="17.5" cy="20.5" r="1.5" stroke="currentColor" stroke-width="1.5" />
                </svg>
          <p>${emptyText}</p>`);
        $('#cart-side-totals, .side-cart-items').html('');
        $('.footer-side-cart').addClass('d-none');
        $('.btn-close-offcanvas').addClass('d-none');
        $('.cart-rules').addClass('d-none');
      }

      setCartTotalAndBadge(cart);

      if (cart.products_count > 0) {
        let foundFreeShipping = false;
        if (cart?.discount_rules?.length) {
          let currency = cart.currency?.cart_currency?.symbol || '';

          cart.discount_rules.forEach(function(rule) {
            if (
              rule.code === "free_shipping" &&
              rule.enabled &&
              cart.fee_shipping_discount_rules
            ) {
              foundFreeShipping = true;
              $('.cart-rules').removeClass('d-none');
              templateRules(rule, { data: { cart } }, currency, cart.fee_shipping_discount_rules);
            }
          });
        }

        if (!foundFreeShipping) {
          $('.cart-rules').addClass('d-none');
        }
      }

      displayActivePaymentSessionBar(cart);
      resolve(response);
    }).catch(error => {
      reject(error);
    }).finally(() => {
      $('.loading-cart').addClass('d-none');
    });
  });
}

const rtl_mode = $("body").hasClass("rtl");

function templateRules(rule, response, currency, fee_shipping_discount_rules) {
  if (!rule.conditions || !rule.conditions[0] || !rule.conditions[0].value) return;
  
  let min_value = rule.conditions[0].value[0];
  let remain_raw = min_value - response.data.cart.products_subtotal;

  let remain_value = remain_raw > 0
    ? (Number.isInteger(remain_raw) ? remain_raw : remain_raw.toFixed(2))
    : 0;

  let percentage = Math.ceil(
    fee_shipping_discount_rules.conditions_subtotal.status.code !== 'applied'
      ? 100 - ((remain_value * 100) / min_value)
      : 100
  );

  if (fee_shipping_discount_rules.conditions_subtotal.status.code !== 'applied') {
    $(".cart-rules").removeClass('d-none');
    $(".cart-rules").html(` 
      <div class="shipping-progress active progress">
          <span class="progress-bar" role="progressbar"
                style="width: ${percentage}%;" 
                aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"></span>
          <div class="progress-value" style="right: calc(${percentage}% - 12px);">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
              <path d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"></path>
            </svg>
          </div>
        </div>
      <div class="shipping-rule-message">
        ${rtl_mode ? "أضف مشتريات بقيمة" : "Add products worth"} 
        <span class="value">${remain_value}</span>
        <span class="currency">${currency}</span>
        <span class="new-line">
          ${rtl_mode ? "للحصول على شحن مجاني 🚚" : "to get Free Shipping 🚚"}
        </span>
      </div>
    `);
  } else {
    $(".cart-rules").html(`
      <div class="shipping-progress active progress">
          <span class="progress-bar" role="progressbar"
                style="width: ${percentage}%;" 
                aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"></span>
          <div class="progress-value" style="right: calc(${percentage}% - 12px);">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
              <path d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"></path>
            </svg>
          </div>
        </div>
      <div class="shipping-rule-message">                       
        ${rtl_mode ? "🎉 حصلت على شحن مجاني!" : "🎉 Shipping is Free Now!"}
      </div>
    `);
  }
}

function removeItem(product_id, item) {
  $(`.side-cart-items li#product_${product_id} .remove`).html('<i class="cart-spinner"></i>');
  
  zid.cart.removeProduct({ product_id: product_id }).then(response => {
    if (response) {
      fetchCart();
    }
  }).catch(err => {
    // إرجاع الزر لحالته الأصلية في حالة الخطأ
    $(`.side-cart-items li#product_${product_id} .remove`).html(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
        <path d="M19.5 5.5L18.8803 15.5251C18.7219 18.0864 18.6428 19.3671 18.0008 20.2879C17.6833 20.7431 17.2747 21.1273 16.8007 21.416C15.8421 22 14.559 22 11.9927 22C9.42312 22 8.1383 22 7.17905 21.4149C6.7048 21.1257 6.296 20.7408 5.97868 20.2848C5.33688 19.3626 5.25945 18.0801 5.10461 15.5152L4.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M3 5.5H21M16.0557 5.5L15.3731 4.09173C14.9196 3.15626 14.6928 2.68852 14.3017 2.39681C14.215 2.3321 14.1231 2.27454 14.027 2.2247C13.5939 2 13.0741 2 12.0345 2C10.9688 2 10.436 2 9.99568 2.23412C9.8981 2.28601 9.80498 2.3459 9.71729 2.41317C9.32164 2.7167 9.10063 3.20155 8.65861 4.17126L8.05292 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M9.5 16.5L9.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M14.5 16.5L14.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    `);
  });
}

$(document).on('click', '.btn-number', function (e) {
  e.preventDefault();
  
  const type = $(this).attr('data-type');
  const fieldName = $(this).attr('data-field');
  const input = $(`input[name='${fieldName}']`);
  let currentVal = parseInt(input.val());
  const minVal = parseInt(input.attr('min')) || 1;
  const maxVal = parseInt(input.attr('max')) || 100;

  if (!isNaN(currentVal)) {
    let newVal = currentVal;
    
    if (type === 'plus' && currentVal < maxVal) {
      newVal = currentVal + 1;
    } else if (type === 'minus' && currentVal > minVal) {
      newVal = currentVal - 1;
    }
    
    if (newVal !== currentVal) {
      input.val(newVal);
      
      // استخراج product_id من fieldName
      const productId = fieldName.replace('quantity_', '');
      
      // تحديث المنتج مباشرة، مع تمرير القيمة القديمة في حالة حدوث خطأ
      updateMiniCartProduct(productId, newVal, currentVal);
    }
  }
});

function updateMiniCartProduct(productId, quantity, previousQuantity) {
  const cartItems = $('.side-cart-items');
  cartItems.fadeTo('slow', 0.3);

  zid.cart.updateProduct({ 
    product_id: productId, 
    quantity: parseInt(quantity) 
  }).then(response => {
    cartItems.fadeTo('slow', 1);
    
    if (response) {
      fetchCart();
    }
  }).catch(err => {
    cartItems.fadeTo('slow', 1);

    // في حالة فشل التحديث من الـ API نرجّع الكمية للقيمة السابقة
    if (previousQuantity !== undefined) {
      const input = $(`input[name='quantity_${productId}']`);
      if (input.length) {
        input.val(previousQuantity);
      }
    }
    
    const fallbackMsg = window.i18n?.requested_quantity_not_available || 'حدث خطأ أثناء تحديث الكمية';

    if (typeof $.toast === 'function') {
      $.toast({
        text: err?.response?.data?.message || fallbackMsg,
        showHideTransition: 'fade',
        allowToastClose: true,
        hideAfter: 2000,
        position: 'top-right',
        textAlign: 'center',
        bgColor: '#d90000',
        textColor: '#fff',
      });
    } else if (typeof window.loadToasterScriptIfNotLoaded === 'function') {
      window.loadToasterScriptIfNotLoaded(function () {
        toastr.error(err?.response?.data?.message || fallbackMsg);
      });
    }
  });
}

// التحكم في عداد الكمية في بطاقة المنتج
$(document).on('click', '.product-card-qty-btn', function(e) {
  e.preventDefault();
  e.stopPropagation();
  
  const $btn = $(this);
  const productId = $btn.data('product-id');
  const $input = $(`.product-card-quantity-input[data-product-id="${productId}"]`);
  
  if (!$input.length) return;
  
  // منع النقرات المتعددة
  if ($btn.prop('disabled')) return;
  
  let currentVal = parseInt($input.val()) || 1;
  const minVal = parseInt($input.attr('min')) || 1;
  const maxVal = parseInt($input.attr('max')) || 100;
  let newVal = currentVal;
  let quantityDiff = 0;
  
  if ($btn.hasClass('product-card-qty-plus')) {
    if (currentVal < maxVal) {
      newVal = currentVal + 1;
      quantityDiff = 1;
      $input.val(newVal);
    } else {
      if (typeof window.loadToasterScriptIfNotLoaded === 'function') {
        window.loadToasterScriptIfNotLoaded(function () {
          toastr.warning(window.i18n?.requested_quantity_not_available || 'الكمية المطلوبة غير متاحة');
        });
      }
      return;
    }
  } else if ($btn.hasClass('product-card-qty-minus')) {
    if (currentVal > minVal) {
      newVal = currentVal - 1;
      quantityDiff = -1;
      $input.val(newVal);
    } else {
      return;
    }
  }
  
  // إضافة/إزالة الفرق من السلة
  if (quantityDiff !== 0 && window.zid && window.zid.cart) {
    // تعطيل الزر مؤقتاً لمنع النقرات المتعددة
    $btn.prop('disabled', true);
    
    if (quantityDiff > 0) {
      // إضافة الفرق للسلة (كان يعمل بشكل صحيح)
      if (window.zid.cart.addProduct) {
        addToCart(productId, quantityDiff, function() {
          $btn.prop('disabled', false);
        });
      } else {
        $btn.prop('disabled', false);
      }
    } else {
      // تحديث الكمية في السلة عند التقليل
      if (window.zid.cart.get && window.zid.cart.updateProduct) {
        window.zid.cart.get()
          .then(function(cartResponse) {
            // محاولة عدة طرق للوصول للبيانات
            let products = [];
            
            if (cartResponse) {
              if (cartResponse.data) {
                if (cartResponse.data.cart && cartResponse.data.cart.products) {
                  products = cartResponse.data.cart.products;
                } else if (cartResponse.data.products) {
                  products = cartResponse.data.products;
                } else if (Array.isArray(cartResponse.data)) {
                  products = cartResponse.data;
                }
              } else if (cartResponse.cart && cartResponse.cart.products) {
                products = cartResponse.cart.products;
              } else if (cartResponse.products) {
                products = cartResponse.products;
              } else if (Array.isArray(cartResponse)) {
                products = cartResponse;
              }
            }
            
            if (products.length === 0) {
              // إذا لم توجد منتجات في السلة، نرجع القيمة السابقة
              $input.val(currentVal);
              $btn.prop('disabled', false);
              return Promise.resolve();
            }
            
            // البحث عن المنتج باستخدام product_id
            let cartItem = null;
            const normalizedProductId = String(productId).replace(/-/g, '');
            
            for (const item of products) {
              const itemProductId = item.product_id || item.id;
              const normalizedItemProductId = String(itemProductId).replace(/-/g, '');
              
              if (String(itemProductId) === String(productId) || 
                  normalizedItemProductId === normalizedProductId ||
                  String(item.id) === String(productId) ||
                  (item.selected_product && String(item.selected_product.id).replace(/-/g, '') === normalizedProductId)) {
                cartItem = item;
                break;
              }
            }
            
            if (cartItem && cartItem.id) {
              // تحديث الكمية في السلة
              const cartItemId = cartItem.id;
              return window.zid.cart.updateProduct({ 
                product_id: cartItemId,
                quantity: newVal 
              });
            } else {
              // إذا لم نجد المنتج، نرجع القيمة السابقة
              $input.val(currentVal);
              $btn.prop('disabled', false);
              return Promise.resolve();
            }
          })
          .then(function(response) {
            // جلب السلة مرة أخرى للتحقق من وجود المنتج بشكل صحيح
            return window.zid.cart.get({ showErrorNotification: true }).then(function(cartResponse) {
              if (cartResponse) {
                // الحصول على قائمة المنتجات في السلة
                let products = [];
                if (cartResponse.data) {
                  if (cartResponse.data.cart && cartResponse.data.cart.products) {
                    products = cartResponse.data.cart.products;
                  } else if (cartResponse.data.products) {
                    products = cartResponse.data.products;
                  } else if (Array.isArray(cartResponse.data)) {
                    products = cartResponse.data;
                  }
                } else if (cartResponse.cart && cartResponse.cart.products) {
                  products = cartResponse.cart.products;
                } else if (cartResponse.products) {
                  products = cartResponse.products;
                } else if (Array.isArray(cartResponse)) {
                  products = cartResponse;
                }
                
                // البحث عن المنتج في السلة بعد التحديث
                const normalizedProductId = String(productId).replace(/-/g, '');
                let productStillInCart = false;
                
                for (const item of products) {
                  const itemProductId = item.product_id || item.id;
                  const normalizedItemProductId = String(itemProductId).replace(/-/g, '');
                  
                  if (String(itemProductId) === String(productId) || 
                      normalizedItemProductId === normalizedProductId ||
                      String(item.id) === String(productId)) {
                    productStillInCart = true;
                    break;
                  }
                }
                
                // إذا لم يعد المنتج في السلة، نبدل بين العنصرين: نرجع footer-btns ونخفي خيار الكمية
                if (!productStillInCart) {
                  const $addToCartBtn = $('.product-card-add-to-cart[data-product-id="' + productId + '"]');
                  const $footerBtns = $addToCartBtn.closest('.footer-btns');
                  const $quantityWrapper = $('.product-card-quantity-wrapper[data-product-id="' + productId + '"]');
                  
                  if ($footerBtns.length && $quantityWrapper.length) {
                    // إظهار footer-btns بالكامل وإخفاء خيار الكمية
                    $footerBtns.removeClass('d-none');
                    $quantityWrapper.addClass('d-none');
                    $quantityWrapper.find('.product-card-quantity-input').val(1);
                  }
                }
                
                // تحديث السلة والعداد
                if (typeof setCartTotalAndBadge === 'function') {
                  setCartTotalAndBadge(cartResponse);
                }
                if (typeof fetchCart === 'function') {
                  fetchCart();
                }
                
                // إظهار رسالة نجاح
                if (typeof window.loadToasterScriptIfNotLoaded === 'function') {
                  window.loadToasterScriptIfNotLoaded(function() {
                    toastr.success(window.i18n?.cart_updated || 'تم تحديث السلة بنجاح');
                  });
                }
              }
              $btn.prop('disabled', false);
            });
          })
          .catch(function(error) {
            // في حالة الخطأ، نرجع القيمة السابقة
            $input.val(currentVal);
            $btn.prop('disabled', false);
            
            if (typeof window.loadToasterScriptIfNotLoaded === 'function') {
              window.loadToasterScriptIfNotLoaded(function() {
                toastr.error(window.i18n?.error_updating_cart || 'حدث خطأ أثناء تحديث السلة');
              });
            }
          });
      } else {
        $btn.prop('disabled', false);
      }
    }
  }
});