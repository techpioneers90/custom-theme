let page = 1;
let isLoading = false;
let categoryId = null;

function initialize() {
  const url = window.location.href;
  if (url.includes("/categories/")) {
    const parts = url.split("/categories/");
    if (parts.length > 1) {
      categoryId = parts[1].split("/")[0];
    }
  }
}

let isCustomerLoggedIn = false;

const waitForCustomerFetched = new Promise((resolve) => {
  document.addEventListener("zid-customer-fetched", function (event) {
    const customer = event.detail.customer;
    isCustomerLoggedIn = !!customer;
    resolve();
  });
});

// دالة جلب Bundle Offer باستخدام API الجديد
async function fetchProductBundleOffer(productId) {
  try {
    const response = await window.zid.products.getBundleOffer(productId);
    
    if (response?.data?.bundle_offer?.payload) {
      return response.data.bundle_offer.payload;
    }
  } catch (error) {
    console.error(`Error fetching bundle offer for product ${productId}:`, error);
  }
  return null;
}

// دالة إنشاء كارت المنتج
async function createProductCard(product) {
  const isOutOfStock = product.is_infinite === false && product.quantity <= 0;
  
  // جلب Bundle Offer للمنتج
  const bundleOffer = await fetchProductBundleOffer(product.id);

  let imagesHTML = `
    <div class="box-img-product img-1">
      <img loading="lazy" class="lazy-img" width="200" height="300" 
      src="${
        product.images && product.images.length
          ? product.images[0]["image"]["large"]
          : window.asset_url + "product-img.svg"
      }" 
      alt="${product.name}">
    </div>
  `;

  if (product.images && product.images.length > 1) {
    imagesHTML += `
      <div class="box-img-product img-2">
        <img loading="lazy" class="lazy-img" width="200" height="300" 
        src="${product.images[1]["image"]["large"]}" 
        alt="${product.name}">
      </div>
    `;
  }

  let userLang = document.documentElement.lang || "ar";

  // عرض البادج العادي
  let badgeHTML = "";
  if (product.badge && product.badge.body) {
    let text = "";
    let body = product.badge.body || {};
  
    if (userLang.startsWith("ar")) {
      text = body.ar || body.en || "";
    } else {
      text = body.en || body.ar || "";
    }
  
    badgeHTML = `
      <span class="badge-name" data-badge-name-product-id="${product.id}">
        <span>${text}</span>
      </span>`;
  }
  
  // عرض Bundle Offer
  let bundleOfferHTML = "";
  let offerText = "";
  
  if (bundleOffer) {
    if (typeof bundleOffer.name === "string") {
      offerText = bundleOffer.name;
    } else if (typeof bundleOffer.name === "object" && bundleOffer.name !== null) {
      offerText =
        bundleOffer.name[userLang] ||
        bundleOffer.name.ar ||
        bundleOffer.name.en ||
        "";
    }
  
    bundleOfferHTML = `
      <span class="product-card-bundle-offer bundle-offer-product-tag" data-bundle-offer-product-id="${product.id}">
        <span>${offerText}</span>
      </span>`;
  }  

  let discountHTML = "";
  if (product.sale_price && product.sale_price < product.price) {
    let discount = Math.round(((product.price - product.sale_price) / product.price) * 100);
    discountHTML = `<span class="discount">- ${discount}%</span>`;
  }

  let outOfStockHTML = "";
  if (isOutOfStock) {
    outOfStockHTML = `<small class="out-of-stock">${window.i18n.lbl_error_product_out_of_stock}</small>`;
  }

  // Rating HTML
  let ratingHTML = "";
  if (window.store_is_reviews_enabled && product.rating && product.rating.total_count > 0) {
    ratingHTML = `
      <div class="product-card-rating-wrapper">
        ${product.rating.average}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-star-fill" viewBox="0 0 16 16">
          <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"></path>
        </svg>
        ${product.rating.total_count > 0 ? `<span class="rating-count">(${product.rating.total_count})</span>` : ''}
      </div>`;
  }

  // Countdown HTML
  let countdownHTML = "";
  if ((product.is_infinite || product.quantity > 0) && product.purchase_restrictions && product.purchase_restrictions.sale_price_period_end) {
    const startDate = product.purchase_restrictions.sale_price_period_start || '';
    const endDate = product.purchase_restrictions.sale_price_period_end;
    countdownHTML = `
      <div class="tp-countdown" ${startDate ? `data-start="${startDate}"` : ''} data-end="${endDate}">
        <ul>
          <li>
            <span class="seconds">0</span>
            ${window.i18n.seconds || 'S'}
          </li>
          <li>
            <span class="minutes">0</span>
            ${window.i18n.minutes || 'M'}
          </li>
          <li>
            <span class="hours">0</span>
            ${window.i18n.hours || 'H'}
          </li>
          <li>
            <span class="days">0</span>
            ${window.i18n.days || 'D'}
          </li>
        </ul>
      </div>`;
  }

  // Price HTML
  let priceHTML = "";
  if (product.sale_price !== null && product.sale_price !== undefined) {
    priceHTML = `
      <div class="tp-price-product">
        <p class="price-new">${product.formatted_sale_price || (product.sale_price + ' ' + (product.currency_symbol || ''))}</p>
        <div class="price-wafar">
          <span class="price-old">${product.formatted_price || (product.price + ' ' + (product.currency_symbol || ''))}</span>
          ${discountHTML ? discountHTML : ''}
        </div>
      </div>`;
  } else {
    priceHTML = `
      <div class="tp-price-product">
        <p class="price-new">${product.formatted_price || (product.price + ' ' + (product.currency_symbol || ''))}</p>
      </div>`;
  }

  let notTaxableHTML = "";
  if ((product.is_infinite || product.quantity > 0) && !product.is_taxable) {
    notTaxableHTML = `<small class="is-not-taxable">${window.i18n.product_is_not_taxable || window.i18n.tax_free || 'Tax free'}</small>`;
  }

  // Action Button
  let actionBtn = "";
  if (isOutOfStock) {
    actionBtn = `
      <a class="btn-product-card-out-of-stock" href="/products/${product.slug}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
          <path fill="currentColor" d="M5.091,6.75 L6.255,6.75 C6.386,3.69 8.908,1.25 12,1.25 C15.092,1.25 17.614,3.69 17.745,6.75 L18.961,6.75 L18.961,6.75 C19.454,6.75 19.907,6.75 20.269,6.805 C20.671,6.866 21.094,7.012 21.404,7.408 C21.708,7.793 21.762,8.237 21.748,8.644 C21.736,9.023 21.658,9.488 21.57,10.012 L21.57,10.012 L21.132,12.624 C21.064,13.032 20.677,13.308 20.269,13.24 C19.86,13.171 19.584,12.785 19.653,12.376 L20.082,9.812 C20.181,9.226 20.24,8.861 20.249,8.594 C20.253,8.469 20.244,8.4 20.236,8.364 C20.232,8.348 20.228,8.34 20.227,8.338 L20.226,8.335 L20.22,8.332 C20.201,8.323 20.152,8.304 20.044,8.288 C19.808,8.252 19.472,8.25 18.909,8.25 L5.091,8.25 C4.528,8.25 4.192,8.252 3.956,8.288 C3.848,8.304 3.799,8.323 3.78,8.332 L3.774,8.335 L3.773,8.338 C3.772,8.34 3.768,8.348 3.764,8.364 C3.756,8.4 3.747,8.469 3.751,8.594 C3.76,8.861 3.819,9.226 3.918,9.812 L5.08,16.75 L11,16.75 C11.414,16.75 11.75,17.086 11.75,17.5 C11.75,17.914 11.414,18.25 11,18.25 L5.34,18.25 C5.433,18.75 5.522,19.163 5.624,19.514 C5.808,20.148 6.009,20.485 6.267,20.716 C6.521,20.942 6.852,21.087 7.452,21.166 C8.076,21.249 8.893,21.25 10.08,21.25 L11,21.25 C11.414,21.25 11.75,21.586 11.75,22 C11.75,22.414 11.414,22.75 11,22.75 L10.025,22.75 C8.904,22.75 7.988,22.75 7.255,22.653 C6.485,22.551 5.827,22.333 5.269,21.835 C4.715,21.341 4.407,20.703 4.183,19.932 C3.967,19.187 3.807,18.233 3.609,17.049 L2.438,10.059 L2.43,10.012 C2.342,9.488 2.264,9.023 2.252,8.644 C2.238,8.237 2.292,7.793 2.596,7.408 C2.906,7.012 3.329,6.866 3.731,6.805 C4.093,6.75 4.546,6.75 5.039,6.75 L5.039,6.75 Z M21.53,15.53 L18.561,18.5 L21.53,21.47 C21.823,21.763 21.823,22.237 21.53,22.53 C21.237,22.823 20.763,22.823 20.47,22.53 L17.5,19.561 L14.53,22.53 C14.237,22.823 13.763,22.823 13.47,22.53 C13.177,22.237 13.177,21.763 13.47,21.47 L16.439,18.5 L13.47,15.53 C13.177,15.237 13.177,14.763 13.47,14.47 C13.763,14.177 14.237,14.177 14.53,14.47 L17.5,17.439 L20.47,14.47 C20.763,14.177 21.237,14.177 21.53,14.47 C21.823,14.763 21.823,15.237 21.53,15.53 Z M12,2.75 C9.737,2.75 7.887,4.519 7.757,6.75 L16.243,6.75 C16.113,4.519 14.263,2.75 12,2.75 Z" />
        </svg>
      </a>`;
  } else if (product.has_options || product.has_fields || product.product_class === 'dynamic_bundle') {
    actionBtn = `
      <button type="button" class="btn-product-card-select-variant" onclick="event.preventDefault(); event.stopPropagation(); openQuickView('${product.id}', '${product.slug}')" aria-label="View options">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
          <path fill="currentColor" d="M2,1.25 L2.966,1.25 C4.239,1.25 5.372,2.093 5.69,3.328 L6.184,5.25 L6.5,5.25 C6.914,5.25 7.25,5.586 7.25,6 C7.25,6.391 6.951,6.712 6.569,6.747 L8.665,14.89 C8.69,14.988 8.71,15.088 8.724,15.187 L16.658,14.526 C18.03,14.412 18.608,14.211 18.929,13.899 C19.249,13.587 19.466,13.014 19.618,11.646 L20.162,6.75 L19.5,6.75 C19.086,6.75 18.75,6.414 18.75,6 C18.75,5.586 19.086,5.25 19.5,5.25 L22,5.25 C22.414,5.25 22.75,5.586 22.75,6 C22.75,6.414 22.414,6.75 22,6.75 L21.671,6.75 L21.109,11.812 C20.959,13.165 20.718,14.251 19.975,14.974 C19.231,15.697 18.139,15.908 16.782,16.021 L8.493,16.712 C8.409,16.89 8.305,17.06 8.182,17.22 L7.703,17.84 C8.151,18.195 8.487,18.685 8.646,19.25 L14.354,19.25 C14.68,18.096 15.741,17.25 17,17.25 C18.519,17.25 19.75,18.481 19.75,20 C19.75,21.519 18.519,22.75 17,22.75 C15.741,22.75 14.68,21.904 14.354,20.75 L8.646,20.75 C8.32,21.904 7.259,22.75 6,22.75 C4.481,22.75 3.25,21.519 3.25,20 C3.25,18.481 4.481,17.25 6,17.25 C6.086,17.25 6.171,17.254 6.255,17.262 L6.995,16.303 C7.227,16.003 7.304,15.621 7.212,15.263 L4.237,3.702 C4.096,3.156 3.582,2.75 2.966,2.75 L2,2.75 C1.586,2.75 1.25,2.414 1.25,2 C1.25,1.586 1.586,1.25 2,1.25 Z M13.75,2.5 L13.75,5.25 L16.5,5.25 C16.914,5.25 17.25,5.586 17.25,6 C17.25,6.414 16.914,6.75 16.5,6.75 L13.75,6.75 L13.75,9.5 C13.75,9.914 13.414,10.25 13,10.25 C12.586,10.25 12.25,9.914 12.25,9.5 L12.25,6.75 L9.5,6.75 C9.086,6.75 8.75,6.414 8.75,6 C8.75,5.586 9.086,5.25 9.5,5.25 L12.25,5.25 L12.25,2.5 C12.25,2.086 12.586,1.75 13,1.75 C13.414,1.75 13.75,2.086 13.75,2.5 Z M17,21.25 C17.69,21.25 18.25,20.69 18.25,20 C18.25,19.31 17.69,18.75 17,18.75 C16.31,18.75 15.75,19.31 15.75,20 C15.75,20.69 16.31,21.25 17,21.25 Z M6,18.75 C5.31,18.75 4.75,19.31 4.75,20 C4.75,20.69 5.31,21.25 6,21.25 C6.69,21.25 7.25,20.69 7.25,20 C7.25,19.31 6.69,18.75 6,18.75 Z" />
        </svg>
      </button>`;
  } else {
    actionBtn = `
      <button type="button" class="product-card-add-to-cart" data-product-id="${product.id}" onclick="event.preventDefault(); event.stopPropagation(); productCartAddToCart(this,'${product.id}')" aria-label="AddToCart">
        <img loading="lazy" style="display: inline" class="add-to-cart-progress d-none" src="${window.asset_url}spinner.gif" width="20" height="20"/>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
          <path fill="currentColor" d="M2,1.25 L2.966,1.25 C4.239,1.25 5.372,2.093 5.69,3.328 L6.184,5.25 L6.5,5.25 C6.914,5.25 7.25,5.586 7.25,6 C7.25,6.391 6.951,6.712 6.569,6.747 L8.665,14.89 C8.69,14.988 8.71,15.088 8.724,15.187 L16.658,14.526 C18.03,14.412 18.608,14.211 18.929,13.899 C19.249,13.587 19.466,13.014 19.618,11.646 L20.162,6.75 L19.5,6.75 C19.086,6.75 18.75,6.414 18.75,6 C18.75,5.586 19.086,5.25 19.5,5.25 L22,5.25 C22.414,5.25 22.75,5.586 22.75,6 C22.75,6.414 22.414,6.75 22,6.75 L21.671,6.75 L21.109,11.812 C20.959,13.165 20.718,14.251 19.975,14.974 C19.231,15.697 18.139,15.908 16.782,16.021 L8.493,16.712 C8.409,16.89 8.305,17.06 8.182,17.22 L7.703,17.84 C8.151,18.195 8.487,18.685 8.646,19.25 L14.354,19.25 C14.68,18.096 15.741,17.25 17,17.25 C18.519,17.25 19.75,18.481 19.75,20 C19.75,21.519 18.519,22.75 17,22.75 C15.741,22.75 14.68,21.904 14.354,20.75 L8.646,20.75 C8.32,21.904 7.259,22.75 6,22.75 C4.481,22.75 3.25,21.519 3.25,20 C3.25,18.481 4.481,17.25 6,17.25 C6.086,17.25 6.171,17.254 6.255,17.262 L6.995,16.303 C7.227,16.003 7.304,15.621 7.212,15.263 L4.237,3.702 C4.096,3.156 3.582,2.75 2.966,2.75 L2,2.75 C1.586,2.75 1.25,2.414 1.25,2 C1.25,1.586 1.586,1.25 2,1.25 Z M13.75,2.5 L13.75,5.25 L16.5,5.25 C16.914,5.25 17.25,5.586 17.25,6 C17.25,6.414 16.914,6.75 16.5,6.75 L13.75,6.75 L13.75,9.5 C13.75,9.914 13.414,10.25 13,10.25 C12.586,10.25 12.25,9.914 12.25,9.5 L12.25,6.75 L9.5,6.75 C9.086,6.75 8.75,6.414 8.75,6 C8.75,5.586 9.086,5.25 9.5,5.25 L12.25,5.25 L12.25,2.5 C12.25,2.086 12.586,1.75 13,1.75 C13.414,1.75 13.75,2.086 13.75,2.5 Z M17,21.25 C17.69,21.25 18.25,20.69 18.25,20 C18.25,19.31 17.69,18.75 17,18.75 C16.31,18.75 15.75,19.31 15.75,20 C15.75,20.69 16.31,21.25 17,21.25 Z M6,18.75 C5.31,18.75 4.75,19.31 4.75,20 C4.75,20.69 5.31,21.25 6,21.25 C6.69,21.25 7.25,20.69 7.25,20 C7.25,19.31 6.69,18.75 6,18.75 Z" />
        </svg>
      </button>`;
  }

  // Quantity Wrapper (مخفي افتراضياً)
  let quantityWrapperHTML = "";
  if (!(product.has_options || product.has_fields || product.product_class === 'dynamic_bundle') && (product.is_infinite || product.quantity > 0)) {
    quantityWrapperHTML = `
      <div class="product-card-quantity-wrapper d-none" data-product-id="${product.id}">
        <div class="product-card-quantity-counter">
          <button type="button" class="product-card-qty-btn product-card-qty-minus" data-product-id="${product.id}" aria-label="Decrease quantity">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" color="#000000" fill="none">
              <path d="M20 12L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <input type="number" class="product-card-quantity-input" data-product-id="${product.id}" value="1" min="1" ${product.is_infinite === false ? `max="${product.quantity}"` : 'max="100"'} readonly>
          <button type="button" class="product-card-qty-btn product-card-qty-plus" data-product-id="${product.id}" aria-label="Increase quantity">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" color="#000000" fill="none">
              <path d="M12 4V20M20 12H4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>`;
  }

  let wishlistHTML = "";
  if (window.store_is_wishlist_enabled) {
    const isInWishlist = product.is_in_wishlist === true;
    wishlistHTML = `
      <span class="add-to-wishlist" data-wishlist-id="${product.id}">
        <span zid-visible-customer="true">
          <button zid-visible-wishlist="${product.id}" class="icon-heart-mask filled" onclick="addToWishlist(this, '${product.id}')"></button>
          <button zid-hidden-wishlist="${product.id}" class="icon-heart-mask" onclick="addToWishlist(this, '${product.id}')"></button>
        </span>
        <a zid-visible-guest="true" class="icon-heart-mask" href="/auth/login?redirect_to=${encodeURIComponent(window.location.href)}" onclick="event.preventDefault(); handleLoginAction('', false); return false;"></a>
        <img loading="lazy" class="loader d-none" src="${window.asset_url}spinner.gif" width="20" height="20" />
      </span>`;
  }

  const productHTML = `
    <div class="product-box card-product-style-2 ${isOutOfStock ? "product-item-out-of-stock" : ""} tp-image-mode-${window.imgFit}" product-id="${product.id}">
      <div class="tp-product-container">
        <div class="img-and-btns">
          ${wishlistHTML}
          <a href="/products/${product.slug}" class="tp-image-product">
            ${imagesHTML}
            <div class="bundle-offer-badge">
              ${bundleOfferHTML}
              ${badgeHTML}
            </div>
            ${outOfStockHTML}
            ${ratingHTML}
            ${countdownHTML}
          </a>
        </div>
        <div class="tp-content-wrapper">
          <a href="/products/${product.slug}" class="tp-content-product">
            <h2>${product.name}</h2>
          </a>
          <div class="price-cart-btns">
            <div class="price-part">
              ${priceHTML}
              ${notTaxableHTML}
            </div>
            <div class="footer-btns">
              ${actionBtn}
            </div>
            ${quantityWrapperHTML}
          </div>
        </div>
      </div>
    </div>`;

  const productElement = document.createElement("div");
  productElement.innerHTML = productHTML;
  return productElement.firstElementChild;
}

// جعل createProductCard متاحة بشكل عام
if (typeof window !== 'undefined') {
  window.createProductCard = createProductCard;
}

// دالة تحميل المزيد من المنتجات عبر تحميل HTML ثم استخراج البيانات
async function loadMoreProducts(lastPage) {
  if (isLoading || page >= lastPage) return;
  isLoading = true;

  const btn = document.getElementById("load-more-button");
  btn.classList.add("opacity-35", "cursor-not-allowed");
  btn.disabled = true;

  try {
    const nextPage = page + 1;
    
    // بناء الـ URL للصفحة التالية
    const url = new URL(window.location.href);
    const searchParams = new URLSearchParams(url.search);
    searchParams.set('page', nextPage);
    
    // طلب الصفحة التالية من السيرفر كـ HTML
    const response = await fetch(`${url.pathname}?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    // إنشاء DOM مؤقت لاستخراج المنتجات
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // البحث عن عناصر المنتجات في الصفحة الجديدة
    const productElements = doc.querySelectorAll('.product-box');
    
    if (productElements.length > 0) {
      page = nextPage;
      const productsWrapper = document.getElementById("products-list");

      // استخراج بيانات المنتجات من العناصر
      const productPromises = Array.from(productElements).map(async (el) => {
        const productId = el.getAttribute('product-id');
        
        // إذا كان لدينا productId، نجلب البيانات من الـ API
        if (productId && window.zid?.products?.get) {
          try {
            const productResponse = await window.zid.products.get(productId);
            if (productResponse?.data?.product) {
              return createProductCard(productResponse.data.product);
            }
          } catch (err) {
            console.warn(`Could not fetch product ${productId}, using HTML element`);
          }
        }
        
        // إذا فشل الحصول على البيانات من API، نستخدم الـ HTML مباشرة
        // لكن نحتاج تحديث Bundle Offer
        const clonedElement = el.cloneNode(true);
        
        // محاولة جلب وتحديث Bundle Offer
        if (productId) {
          try {
            const bundleOffer = await fetchProductBundleOffer(productId);
            if (bundleOffer) {
              const userLang = document.documentElement.lang || "ar";
              let offerText = "";
              
              if (typeof bundleOffer.name === "string") {
                offerText = bundleOffer.name;
              } else if (typeof bundleOffer.name === "object" && bundleOffer.name !== null) {
                offerText =
                  bundleOffer.name[userLang] ||
                  bundleOffer.name.ar ||
                  bundleOffer.name.en ||
                  "";
              }
              
              if (offerText) {
                const badgeContainer = clonedElement.querySelector('.bundle-offer-badge');
                if (badgeContainer) {
                  const existingOffer = badgeContainer.querySelector('.product-card-bundle-offer');
                  if (existingOffer) {
                    existingOffer.querySelector('span').textContent = offerText;
                  } else {
                    const bundleOfferHTML = `
                      <span class="product-card-bundle-offer bundle-offer-product-tag" data-bundle-offer-product-id="${productId}">
                        <span>${offerText}</span>
                      </span>`;
                    badgeContainer.insertAdjacentHTML('afterbegin', bundleOfferHTML);
                  }
                }
              }
            }
          } catch (err) {
            console.warn(`Could not fetch bundle offer for ${productId}`);
          }
        }
        
        return clonedElement;
      });

      const newItems = await Promise.all(productPromises);
      newItems.forEach(item => {
        if (item) {
          productsWrapper.appendChild(item);
        }
      });

      // تفعيل العداد التنازلي والتحقق من الأسعار بعد إضافة جميع المنتجات
      if (typeof initializeCountdowns === 'function') {
        initializeCountdowns(productsWrapper);
      }
      
      if (typeof formatPrices === 'function') {
        formatPrices(productsWrapper);
      }

      // إخفاء زر "تحميل المزيد" عند الوصول للصفحة الأخيرة
      if (page >= lastPage) {
        btn.style.display = "none";
      }
    } else {
      console.warn('No products found in the loaded page');
      // إخفاء الزر إذا لم يتم العثور على منتجات
      if (page >= lastPage) {
        btn.style.display = "none";
      }
    }
  } catch (e) {
    console.error("Error loading products:", e);
  }

  isLoading = false;
  btn.classList.remove("opacity-35", "cursor-not-allowed");
  btn.disabled = false;
}

// Event listener عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", async () => {
  initialize();

  await waitForCustomerFetched;

  const btn = document.getElementById("load-more-button");
  const footer = document.querySelector(".footer");

  if (!btn || parseInt(btn.dataset.pages) <= 1) {
    if (btn) btn.style.display = "none";
    return;
  }

  const lastPage = parseInt(btn.dataset.pages);
  
  // تفعيل التحميل عند الضغط على زر "تحميل المزيد"
  btn.addEventListener("click", () => {
    if (!isLoading) {
      const loader = btn.querySelector('.btn-loader');
      if (loader) {
        loader.classList.remove('d-none');
      }
      loadMoreProducts(lastPage).finally(() => {
        if (loader) {
          loader.classList.add('d-none');
        }
      });
    }
  });

  // التحميل التلقائي عند الوصول للـ footer
  if (window.enableAutoLoadMore && footer) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoading) {
            loadMoreProducts(lastPage);
          }
        });
      },
      {
        root: null,
        threshold: 0.1,
      }
    );
    observer.observe(footer);
  }
});