// Script — empty for now

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("custom-print-form")) {
  const fileDrop = document.querySelector("#file-drop");
  const fileInput = document.querySelector("#file-input");
  const emptyView = document.querySelector(".file-drop-empty");
  const selectedView = document.querySelector(".file-drop-selected");
  const fileNameEl = document.querySelector(".file-name");
  const fileSizeEl = document.querySelector(".file-size");
  const removeBtn = document.querySelector(".file-remove");
  const form = document.querySelector("#custom-print-form");
  const successEl = document.querySelector(".form-success");

  const formatBytes = (bytes) => {
    const kilobytes = bytes / 1024;

    if (kilobytes < 1024) {
      return `${kilobytes.toFixed(1)} KB`;
    }

    return `${(kilobytes / 1024).toFixed(1)} MB`;
  };

  const isValidModelFile = (file) => {
    const validExtensions = [".stl", ".obj", ".3mf"];
    const fileName = file.name.toLowerCase();

    return validExtensions.some((extension) => fileName.endsWith(extension));
  };

  fileDrop.addEventListener("click", (event) => {
    if (event.target.closest(".file-remove")) {
      return;
    }

    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];

    if (!file) {
      return;
    }

    if (!isValidModelFile(file)) {
      alert("Please upload a .stl, .obj, or .3mf file");
      fileInput.value = "";
      return;
    }

    emptyView.hidden = true;
    selectedView.hidden = false;
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatBytes(file.size);
  });

  fileDrop.addEventListener("dragover", (event) => {
    event.preventDefault();
    fileDrop.classList.add("dragover");
  });

  fileDrop.addEventListener("dragleave", () => {
    fileDrop.classList.remove("dragover");
  });

  fileDrop.addEventListener("drop", (event) => {
    event.preventDefault();
    fileDrop.classList.remove("dragover");

    const file = event.dataTransfer.files[0];

    if (!file) {
      return;
    }

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event("change"));
  });

  removeBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    fileInput.value = "";
    selectedView.hidden = true;
    emptyView.hidden = false;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const file = fileInput.files[0];
    const email = form.email.value.trim();
    const notes = form.notes.value.trim();

    if (!file) {
      alert("Please upload a 3D model file");
      return;
    }

    if (!email) {
      alert("Please enter your email");
      return;
    }

    try {
      const response = await fetch("/api/custom-print-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          notes,
          fileName: file.name,
          fileSize: formatBytes(file.size),
        }),
      });

      if (!response.ok) {
        throw new Error("submit failed");
      }
    } catch (err) {
      alert("Failed to submit, please try again");
      return;
    }

    console.log({
      fileName: file.name,
      fileSize: formatBytes(file.size),
      email,
      notes,
    });

    form.querySelectorAll(".file-drop, .form-row, .submit-button").forEach((element) => {
      element.hidden = true;
    });
    successEl.hidden = false;
  });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("lightbox")) {
  const galleryItems = document.querySelectorAll(".gallery-item");
  const lightbox = document.querySelector("#lightbox");
  const lightboxCategory = document.querySelector(".lightbox-category");
  const lightboxTitle = document.querySelector(".lightbox-title");
  const lightboxDescription = document.querySelector(".lightbox-description");
  const lightboxImageEl = document.querySelector("#lightbox-image-el");

  const openLightbox = (item) => {
    lightboxCategory.textContent = item.dataset.category;
    lightboxTitle.textContent = item.dataset.title;
    lightboxDescription.textContent = item.dataset.description;
    lightboxImageEl.src = item.dataset.image;
    lightboxImageEl.alt = item.dataset.title;
    lightbox.hidden = false;
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
  };

  const closeLightbox = () => {
    lightbox.hidden = true;
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImageEl.src = "";
    document.body.classList.remove("lightbox-open");
  };

  galleryItems.forEach((item) => {
    item.addEventListener("click", () => openLightbox(item));
  });

  lightbox.addEventListener("click", (event) => {
    if (event.target.hasAttribute("data-lightbox-close")) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !lightbox.hidden) {
      closeLightbox();
    }
  });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const cartKey = "cart";
  const cartButton = document.querySelector("#cart-button");
  const cartCount = document.querySelector("#cart-count");
  const drawerOverlay = document.querySelector("#drawer-overlay");
  const drawers = document.querySelectorAll("#cart-drawer, #checkout-drawer, #success-drawer");
  const cartDrawer = document.querySelector("#cart-drawer");
  const checkoutDrawer = document.querySelector("#checkout-drawer");
  const successDrawer = document.querySelector("#success-drawer");
  const cartEmpty = document.querySelector("#cart-empty");
  const cartItems = document.querySelector("#cart-items");
  const cartFooter = document.querySelector("#cart-footer");
  const cartSubtotalValue = document.querySelector("#cart-subtotal-value");
  const checkoutButton = document.querySelector("#checkout-button");
  const checkoutBack = document.querySelector("#checkout-back");
  const checkoutSummary = document.querySelector("#checkout-summary");
  const checkoutForm = document.querySelector("#checkout-form");
  const checkoutName = document.querySelector("#checkout-name");
  const checkoutEmail = document.querySelector("#checkout-email");
  const checkoutAddress = document.querySelector("#checkout-address");
  const orderNumber = document.querySelector("#order-number");

  const getCart = () => {
    const savedCart = localStorage.getItem(cartKey);

    if (!savedCart) {
      return [];
    }

    try {
      return JSON.parse(savedCart);
    } catch {
      return [];
    }
  };

  const getCartTotal = (cart) => cart.reduce((total, item) => total + item.price * item.qty, 0);

  const saveCart = (cart) => {
    localStorage.setItem(cartKey, JSON.stringify(cart));
    renderCart();
    updateCartBadge();
  };

  const addToCart = (name, price, image) => {
    const cart = getCart();
    const existingItem = cart.find((item) => item.name === name);

    if (existingItem) {
      existingItem.qty += 1;
      existingItem.image = existingItem.image || image;
    } else {
      cart.push({ name, price, qty: 1, image });
    }

    saveCart(cart);
  };

  const changeQty = (name, delta) => {
    const cart = getCart();
    const item = cart.find((cartItem) => cartItem.name === name);

    if (!item) {
      return;
    }

    item.qty += delta;

    if (item.qty <= 0) {
      removeFromCart(name);
      return;
    }

    saveCart(cart);
  };

  const removeFromCart = (name) => {
    const cart = getCart().filter((item) => item.name !== name);
    saveCart(cart);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const updateCartBadge = () => {
    const totalQty = getCart().reduce((total, item) => total + item.qty, 0);

    if (totalQty === 0) {
      cartCount.hidden = true;
      return;
    }

    cartCount.hidden = false;
    cartCount.textContent = totalQty;
  };

  const renderCart = () => {
    const cart = getCart();
    cartItems.innerHTML = "";

    if (cart.length === 0) {
      cartEmpty.hidden = false;
      cartFooter.hidden = true;
      cartSubtotalValue.textContent = "$0";
      return;
    }

    cartEmpty.hidden = true;
    cartFooter.hidden = false;

    cart.forEach((item) => {
      const cartItem = document.createElement("li");
      const thumb = document.createElement("div");
      const info = document.createElement("div");
      const name = document.createElement("p");
      const price = document.createElement("p");
      const removeButton = document.createElement("button");
      const controls = document.createElement("div");
      const decButton = document.createElement("button");
      const qtyValue = document.createElement("span");
      const incButton = document.createElement("button");

      cartItem.className = "cart-item";
      thumb.className = "cart-item-thumb";
      info.className = "cart-item-info";
      name.className = "cart-item-name";
      price.className = "cart-item-price";
      removeButton.className = "cart-item-remove";
      controls.className = "cart-item-controls";
      decButton.className = "qty-button";
      qtyValue.className = "qty-value";
      incButton.className = "qty-button";

      name.textContent = item.name;
      price.textContent = `$${item.price} × ${item.qty}`;
      removeButton.type = "button";
      removeButton.textContent = "Remove";
      decButton.type = "button";
      decButton.dataset.action = "dec";
      decButton.textContent = "−";
      qtyValue.textContent = item.qty;
      incButton.type = "button";
      incButton.dataset.action = "inc";
      incButton.textContent = "+";

      if (item.image) {
        const thumbImage = document.createElement("img");
        thumbImage.src = item.image;
        thumbImage.alt = item.name;
        thumbImage.loading = "lazy";
        thumb.append(thumbImage);
      }

      removeButton.addEventListener("click", () => removeFromCart(item.name));
      decButton.addEventListener("click", () => changeQty(item.name, -1));
      incButton.addEventListener("click", () => changeQty(item.name, 1));

      info.append(name, price, removeButton);
      controls.append(decButton, qtyValue, incButton);
      cartItem.append(thumb, info, controls);
      cartItems.append(cartItem);
    });

    cartSubtotalValue.textContent = `$${getCartTotal(cart)}`;
  };

  const openDrawer = (drawerId) => {
    drawers.forEach((drawer) => {
      drawer.hidden = true;
      drawer.setAttribute("aria-hidden", "true");
    });

    const drawer = document.querySelector(`#${drawerId}`);
    drawer.hidden = false;
    drawer.setAttribute("aria-hidden", "false");
    drawerOverlay.hidden = false;
    document.body.classList.add("drawer-open");
  };

  const closeAllDrawers = () => {
    drawers.forEach((drawer) => {
      drawer.hidden = true;
      drawer.setAttribute("aria-hidden", "true");
    });

    drawerOverlay.hidden = true;
    document.body.classList.remove("drawer-open");
  };

  const renderCheckoutSummary = () => {
    const cart = getCart();
    const total = getCartTotal(cart);

    checkoutSummary.innerHTML = "";

    cart.forEach((item) => {
      const row = document.createElement("div");
      const label = document.createElement("span");
      const subtotal = document.createElement("span");

      row.className = "checkout-summary-row";
      label.textContent = `${item.name} × ${item.qty}`;
      subtotal.textContent = `$${item.price * item.qty}`;

      row.append(label, subtotal);
      checkoutSummary.append(row);
    });

    const totalRow = document.createElement("div");
    const totalLabel = document.createElement("span");
    const totalValue = document.createElement("span");

    totalRow.className = "checkout-summary-total";
    totalLabel.textContent = "Total";
    totalValue.textContent = `$${total}`;

    totalRow.append(totalLabel, totalValue);
    checkoutSummary.append(totalRow);
  };

  const productCardHTML = (p) => {
    const features = (p.features || []).join("|");
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    }[c]));
    const isComingSoon = p.id === "custom-keychain";
    const imageClass = isComingSoon ? "product-image product-image-coming-soon" : "product-image";
    const comingSoonBadge = isComingSoon ? '<span class="coming-soon-badge">Coming Soon</span>' : "";

    return `<article class="product-card" data-id="${esc(p.id)}" data-features="${esc(features)}">
    <div class="${imageClass}"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">${comingSoonBadge}</div>
    <div class="product-info">
      <h3 class="product-name">${esc(p.name)}</h3>
      <p class="product-description">${esc(p.description)}</p>
      <div class="product-footer">
        <span class="product-price">$${p.price}</span>
        <button class="add-to-cart" type="button">Add to Cart</button>
      </div>
    </div>
  </article>`;
  };

  const loadProducts = async () => {
    const shopGrid = document.getElementById("shop-grid");
    const featuredGrid = document.getElementById("featured-grid");

    if (!shopGrid && !featuredGrid) {
      return;
    }

    try {
      const response = await fetch("/api/products");

      if (!response.ok) {
        throw new Error("fetch failed");
      }

      const products = await response.json();

      if (shopGrid) {
        shopGrid.innerHTML = products.map(productCardHTML).join("");
      }

      if (featuredGrid) {
        featuredGrid.innerHTML = products.filter((product) => product.featured).map(productCardHTML).join("");
      }

      document.querySelectorAll("#shop-grid .product-card, #featured-grid .product-card").forEach((card) => {
        card.classList.add("reveal");

        if (window._revealObserver) {
          window._revealObserver.observe(card);
        } else if (!("IntersectionObserver" in window)) {
          card.classList.add("is-visible");
        }
      });
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  };

  if (document.getElementById("cart-button")) {
    cartButton.addEventListener("click", () => openDrawer("cart-drawer"));
  }

  document.querySelectorAll("[data-drawer-close]").forEach((element) => {
    element.addEventListener("click", () => closeAllDrawers());
  });

  drawerOverlay.addEventListener("click", () => closeAllDrawers());

  document.addEventListener("keydown", (event) => {
    const isDrawerVisible = !cartDrawer.hidden || !checkoutDrawer.hidden || !successDrawer.hidden;

    if (event.key === "Escape" && isDrawerVisible) {
      closeAllDrawers();
    }
  });

  checkoutButton.addEventListener("click", () => {
    renderCheckoutSummary();
    openDrawer("checkout-drawer");
  });

  checkoutBack.addEventListener("click", () => openDrawer("cart-drawer"));

  document.addEventListener("click", (event) => {
    const addBtn = event.target.closest(".add-to-cart");

    if (addBtn) {
      event.stopPropagation();
      const card = addBtn.closest(".product-card");

      if (!card) {
        return;
      }

      const name = card.querySelector(".product-name").textContent;
      const price = parseFloat(card.querySelector(".product-price").textContent.replace("$", ""));
      const image = card.querySelector(".product-image img").src;

      addToCart(name, price, image);
      openDrawer("cart-drawer");
      return;
    }

    const card = event.target.closest(".product-card");

    if (card && window.openProductModal) {
      window.openProductModal(card);
    }
  });

  checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const cart = getCart();
    const name = checkoutName.value.trim();
    const email = checkoutEmail.value.trim();
    const address = checkoutAddress.value.trim();
    const total = getCartTotal(cart);

    if (!name) {
      alert("Please enter your full name");
      return;
    }

    if (!email) {
      alert("Please enter your email");
      return;
    }

    if (!address) {
      alert("Please enter your shipping address");
      return;
    }

    if (cart.length === 0) {
      alert("Your cart is empty");
      return;
    }

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: { name, email, address }, items: cart, total }),
      });

      if (!response.ok) {
        throw new Error("order failed");
      }

      const data = await response.json();
      orderNumber.textContent = data.orderNumber;
      console.log({
        orderNumber: data.orderNumber,
        customer: { name, email, address },
        items: cart,
        total,
      });
    } catch (err) {
      alert("Failed to place order, please try again");
      return;
    }

    clearCart();
    checkoutForm.reset();
    openDrawer("success-drawer");
  });

  if (document.getElementById("cart-count")) {
    updateCartBadge();
    renderCart();
  }

  const revealElements = document.querySelectorAll(".product-card, .gallery-item, .teaser, .step, .trust-item");

  revealElements.forEach((element) => {
    element.classList.add("reveal");
  });

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    window._revealObserver = revealObserver;

    document.querySelectorAll(".reveal").forEach((element) => {
      revealObserver.observe(element);
    });
  } else {
    document.querySelectorAll(".reveal").forEach((element) => {
      element.classList.add("is-visible");
    });
  }

  loadProducts();
});

document.addEventListener("DOMContentLoaded", () => {
  const productModal = document.querySelector("#product-modal");

  if (!productModal) {
    return;
  }

  const modalImg = document.querySelector("#product-modal-img");
  const modalTitle = document.querySelector("#product-modal-title");
  const modalDescription = document.querySelector("#product-modal-description");
  const modalFeatures = document.querySelector("#product-modal-features");
  const modalPrice = document.querySelector("#product-modal-price");
  const modalAdd = document.querySelector("#product-modal-add");
  const reviewsSummary = document.querySelector("#reviews-summary");
  const reviewsEmpty = document.querySelector("#reviews-empty");
  const reviewsList = document.querySelector("#reviews-list");
  const showMoreReviews = document.querySelector("#show-more-reviews");
  const reviewForm = document.querySelector("#review-form");
  const reviewName = document.querySelector("#review-name");
  const reviewText = document.querySelector("#review-text");
  const reviewCounter = document.querySelector("#review-counter");
  const reviewMessage = document.querySelector("#review-message");
  const ratingInput = document.querySelector("#review-rating");
  let currentCard = null;
  let currentProductId = "";
  let currentRating = 0;
  let currentReviews = [];
  let visibleReviewCount = 5;

  const formatReviewDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const starText = (rating) => {
    const filled = Math.max(0, Math.min(5, Number(rating) || 0));
    return "★".repeat(filled) + "☆".repeat(5 - filled);
  };

  const updateRatingInput = (rating) => {
    currentRating = rating;
    ratingInput.querySelectorAll("button").forEach((button) => {
      const isActive = Number(button.dataset.rating) <= rating;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-checked", isActive ? "true" : "false");
    });
  };

  const setReviewMessage = (text, type = "") => {
    reviewMessage.textContent = text;
    reviewMessage.className = `review-message ${type}`.trim();
  };

  const renderReviews = (data) => {
    currentReviews = Array.isArray(data.reviews) ? data.reviews : [];
    reviewsList.innerHTML = "";
    reviewsEmpty.hidden = data.totalCount > 0;
    reviewsSummary.hidden = data.totalCount === 0;

    if (data.totalCount > 0) {
      reviewsSummary.innerHTML = `
        <strong>${Number(data.averageRating || 0).toFixed(1)}</strong>
        <span class="review-stars">${starText(Math.round(data.averageRating || 0))}</span>
        <span class="reviews-count">(based on ${data.totalCount} ${data.totalCount === 1 ? "review" : "reviews"})</span>
      `;
    }

    currentReviews.slice(0, visibleReviewCount).forEach((review) => {
      const item = document.createElement("article");
      const meta = document.createElement("div");
      const stars = document.createElement("span");
      const name = document.createElement("strong");
      const date = document.createElement("span");
      const text = document.createElement("p");

      item.className = "review-item";
      meta.className = "review-meta";
      stars.className = "review-stars";
      date.className = "review-date";
      stars.textContent = starText(review.rating);
      name.textContent = review.customerName;
      date.textContent = formatReviewDate(review.createdAt);
      text.textContent = review.reviewText;

      meta.append(stars, name, date);
      item.append(meta, text);
      reviewsList.append(item);
    });

    showMoreReviews.hidden = currentReviews.length <= visibleReviewCount;
  };

  const loadReviews = async (productId) => {
    reviewsList.innerHTML = "";
    reviewsSummary.hidden = true;
    reviewsEmpty.hidden = false;
    reviewsEmpty.textContent = "Loading reviews...";
    showMoreReviews.hidden = true;

    try {
      const response = await fetch(`/api/reviews/${encodeURIComponent(productId)}`);

      if (!response.ok) {
        throw new Error("reviews failed");
      }

      const data = await response.json();
      reviewsEmpty.textContent = "No reviews yet. Be the first to review!";
      renderReviews(data);
    } catch (err) {
      reviewsEmpty.textContent = "Reviews are unavailable right now.";
    }
  };

  const resetReviewForm = () => {
    reviewForm.reset();
    updateRatingInput(0);
    reviewCounter.textContent = "0/500";
    setReviewMessage("");
  };

  const openProductModal = (card) => {
    const productId = card.dataset.id;
    const name = card.querySelector(".product-name").textContent;
    const description = card.querySelector(".product-description").textContent;
    const price = card.querySelector(".product-price").textContent;
    const imgSrc = card.querySelector(".product-image img").src;
    const features = (card.dataset.features || "").split("|").filter(Boolean);

    modalImg.src = imgSrc;
    modalImg.alt = name;
    modalTitle.textContent = name;
    modalDescription.textContent = description;
    modalPrice.textContent = price;
    modalFeatures.innerHTML = "";

    features.forEach((feature) => {
      const featureItem = document.createElement("li");
      featureItem.textContent = feature;
      modalFeatures.append(featureItem);
    });

    currentCard = card;
    currentProductId = productId;
    visibleReviewCount = 5;
    resetReviewForm();
    loadReviews(productId);
    productModal.hidden = false;
    productModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("product-modal-open");
  };

  window.openProductModal = openProductModal;

  const closeProductModal = () => {
    productModal.hidden = true;
    productModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("product-modal-open");
    currentCard = null;
    currentProductId = "";

    setTimeout(() => {
      if (productModal.hidden) {
        modalImg.src = "";
      }
    }, 200);
  };

  document.querySelectorAll("[data-product-modal-close]").forEach((element) => {
    element.addEventListener("click", () => closeProductModal());
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !productModal.hidden) {
      closeProductModal();
    }
  });

  modalAdd.addEventListener("click", () => {
    if (!currentCard) {
      return;
    }

    const addButton = currentCard.querySelector(".add-to-cart");

    if (addButton) {
      addButton.click();
    }

    closeProductModal();
  });

  ratingInput.addEventListener("click", (event) => {
    const button = event.target.closest("[data-rating]");

    if (!button) {
      return;
    }

    updateRatingInput(Number(button.dataset.rating));
    setReviewMessage("");
  });

  reviewText.addEventListener("input", () => {
    reviewCounter.textContent = `${reviewText.value.length}/500`;
  });

  showMoreReviews.addEventListener("click", () => {
    visibleReviewCount += 5;
    renderReviews({
      averageRating: currentReviews.length
        ? currentReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / currentReviews.length
        : 0,
      totalCount: currentReviews.length,
      reviews: currentReviews,
    });
  });

  reviewForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setReviewMessage("");

    if (!currentProductId) {
      setReviewMessage("Choose a product before leaving a review.", "error");
      return;
    }

    if (!reviewName.value.trim() || !currentRating || !reviewText.value.trim()) {
      setReviewMessage("Name, rating, and review are required.", "error");
      return;
    }

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: currentProductId,
          customerName: reviewName.value.trim(),
          rating: currentRating,
          reviewText: reviewText.value.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit review");
      }

      resetReviewForm();
      setReviewMessage("Thanks! Your review will appear after moderation.", "success");
    } catch (err) {
      setReviewMessage(err.message, "error");
    }
  });
});
