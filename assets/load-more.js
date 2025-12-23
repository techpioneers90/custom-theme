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

  let priceHTML = "";
  if (product.formatted_sale_price) {
    priceHTML = `<p class="price-new">${product.formatted_sale_price}</p>
      <div class="price-wafar">
        <span class="price-old">${product.formatted_price}</span>
      </div>`;
  } else {
    priceHTML = `<p class="price-new price-color">${product.formatted_price}</p>`;
  }

  let notTaxableHTML = "";
  if ((product.is_infinite || product.quantity > 0) && !product.is_taxable) {
    notTaxableHTML = `<small class="is-not-taxable">${window.i18n.product_is_not_taxable}</small>`;
  }

  let actionBtn = "";
  if (isOutOfStock) {
    actionBtn = `<a class="btn-product-card-out-of-stock" disabled><span>${window.i18n.btn_error_product_out_of_stock}</span></a>`;
  } else if (product.has_options || product.has_fields) {
    actionBtn = `<a class="btn-product-card-select-variant" href="/products/${product.slug}">${window.i18n.product_has_options}</a>`;
  } else {
    actionBtn = `
      <button type="button" class="product-card-add-to-cart" onclick="productCartAddToCart(this,'${product.id}')" aria-label="AddToCart">
        <img loading="lazy" style="display: inline" class="add-to-cart-progress d-none" src="${window.asset_url}spinner.gif" width="20" height="20"/>
        ${window.i18n.add_to_cart}
      </button>`;
  }

  let wishlistHTML = "";
  if (window.store_is_wishlist_enabled) {
    const isInWishlist = product.is_in_wishlist === true;
    if (isCustomerLoggedIn) {
      wishlistHTML = `
        <span class="add-to-wishlist" data-wishlist-id="${product.id}">
          <span class="icon-heart-mask ${isInWishlist ? "filled" : ""}" 
            onclick="addToWishlist(this, '${product.id}')" aria-label="Wishlist">
          </span>
          <img loading="lazy" class="loader d-none" src="${window.asset_url}spinner.gif" width="20" height="20"/>
        </span>`;
    } else {
      wishlistHTML = `
        <a class="icon-heart-mask" href="/auth/login?redirect_to=${window.location.href}" aria-label="Wishlist"></a>`;
    }
  }

  const productHTML = `
    <div class="product-box ${isOutOfStock ? "product-item-out-of-stock" : ""} tp-image-mode-${window.imgFit}" product-id="${product.id}">
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
          </a>
          <div class="footer-btns">
            ${actionBtn}
          </div>
        </div>
        <div class="tp-content-wrapper">
          <a href="/products/${product.slug}" class="tp-content-product">
            <h2>${product.name}</h2>
            <div class="tp-price-product">
              ${priceHTML}
              ${discountHTML}
            </div>
            ${notTaxableHTML}
          </a>
          <div class="footer-btns">
            ${actionBtn}
          </div>
        </div>
      </div>
    </div>`;

  const productElement = document.createElement("div");
  productElement.innerHTML = productHTML;
  return productElement.firstElementChild;
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
          
          // تفعيل العداد التنازلي للمنتج الجديد
          if (typeof initializeCountdowns === 'function') {
            initializeCountdowns(item);
          }
        }
      });

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