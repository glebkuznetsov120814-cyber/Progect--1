const ADMIN_PASSWORD_KEY = "vertex3dAdminPassword";

const getPassword = () => sessionStorage.getItem(ADMIN_PASSWORD_KEY) || "";

const setMessage = (id, text) => {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
};

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Password": getPassword(),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;",
}[char]));

const starText = (rating) => "★".repeat(Number(rating) || 0) + "☆".repeat(5 - (Number(rating) || 0));

const setupLogin = () => {
  const form = document.getElementById("admin-login-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = document.getElementById("admin-password").value.trim();

    if (!password) {
      setMessage("login-message", "Enter the password.");
      return;
    }

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error("Wrong password");
      }

      sessionStorage.setItem(ADMIN_PASSWORD_KEY, password);
      window.location.href = "dashboard.html";
    } catch (err) {
      setMessage("login-message", "Wrong password.");
    }
  });
};

const setupDashboard = () => {
  const productsTable = document.getElementById("products-table");
  if (!productsTable) return;

  if (!getPassword()) {
    window.location.href = "login.html";
    return;
  }

  const productForm = document.getElementById("product-form");
  const productFormTitle = document.getElementById("product-form-title");
  const editingProductId = document.getElementById("editing-product-id");
  const productId = document.getElementById("product-id");
  const productName = document.getElementById("product-name");
  const productPrice = document.getElementById("product-price");
  const productImage = document.getElementById("product-image");
  const productDescription = document.getElementById("product-description");
  const productFeatures = document.getElementById("product-features");
  const productFeatured = document.getElementById("product-featured");
  const reviewsList = document.getElementById("reviews-list");
  let products = [];
  let requests = [];
  let orders = [];
  let reviews = [];
  let reviewFilter = "pending";

  const updateStats = () => {
    document.getElementById("stat-products").textContent = products.length;
    document.getElementById("stat-requests").textContent = requests.length;
    document.getElementById("stat-orders").textContent = orders.length;
    document.getElementById("stat-reviews").textContent = reviews.length;
  };

  const resetProductForm = () => {
    productForm.reset();
    editingProductId.value = "";
    productId.disabled = false;
    productFormTitle.textContent = "Add Product";
    setMessage("product-message", "");
  };

  const productPayload = () => ({
    id: productId.value.trim(),
    name: productName.value.trim(),
    description: productDescription.value.trim(),
    features: productFeatures.value.split("\n").map((feature) => feature.trim()).filter(Boolean),
    price: Number(productPrice.value),
    image: productImage.value.trim(),
    featured: productFeatured.checked,
  });

  const renderProducts = () => {
    productsTable.innerHTML = products.map((product) => `
      <tr>
        <td>
          <strong>${escapeHtml(product.name)}</strong>
          <div class="muted">${escapeHtml(product.id)}</div>
        </td>
        <td>$${escapeHtml(product.price)}</td>
        <td>${product.featured ? "Yes" : "No"}</td>
        <td>
          <div class="row-actions">
            <button class="table-action" type="button" data-edit-product="${escapeHtml(product.id)}">Edit</button>
            <button class="danger-button" type="button" data-delete-product="${escapeHtml(product.id)}">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");
    updateStats();
  };

  const renderRequests = () => {
    const table = document.getElementById("requests-table");
    table.innerHTML = requests.map((request) => `
      <tr>
        <td>${escapeHtml(request.id)}</td>
        <td>${escapeHtml(request.email)}</td>
        <td>
          ${escapeHtml(request.fileName || "")}
          <div class="muted">${escapeHtml(request.fileSize || "")}</div>
        </td>
        <td>${escapeHtml(request.notes || "")}</td>
        <td>${escapeHtml(formatDate(request.createdAt))}</td>
      </tr>
    `).join("") || '<tr><td colspan="5" class="muted">No custom print requests yet.</td></tr>';
    updateStats();
  };

  const renderOrders = () => {
    const table = document.getElementById("orders-table");
    table.innerHTML = orders.map((order) => {
      const customer = order.customer || {};
      const items = Array.isArray(order.items) ? order.items : [];
      const itemText = items.map((item) => `${item.name} x ${item.qty}`).join(", ");

      return `
        <tr>
          <td>${escapeHtml(order.orderNumber)}</td>
          <td>
            <strong>${escapeHtml(customer.name || "")}</strong>
            <div class="muted">${escapeHtml(customer.email || "")}</div>
            <div class="muted">${escapeHtml(customer.address || "")}</div>
          </td>
          <td>${escapeHtml(itemText)}</td>
          <td>$${escapeHtml(order.total ?? 0)}</td>
          <td>${escapeHtml(formatDate(order.createdAt))}</td>
        </tr>
      `;
    }).join("") || '<tr><td colspan="5" class="muted">No orders yet.</td></tr>';
    updateStats();
  };

  const updateReviewFilters = () => {
    const pendingCount = reviews.filter((review) => review.status === "pending").length;
    const approvedCount = reviews.filter((review) => review.status === "approved").length;

    document.querySelector('[data-review-filter="pending"]').textContent = `Pending (${pendingCount})`;
    document.querySelector('[data-review-filter="approved"]').textContent = `Approved (${approvedCount})`;
    document.querySelector('[data-review-filter="all"]').textContent = `All (${reviews.length})`;

    document.querySelectorAll(".review-filter").forEach((button) => {
      button.classList.toggle("active", button.dataset.reviewFilter === reviewFilter);
    });
  };

  const renderReviews = () => {
    updateReviewFilters();
    const filteredReviews = reviewFilter === "all"
      ? reviews
      : reviews.filter((review) => review.status === reviewFilter);

    reviewsList.innerHTML = filteredReviews.map((review) => {
      const status = review.status || "pending";
      const actions = [
        status !== "approved"
          ? `<button class="table-action" type="button" data-review-action="approve" data-review-id="${escapeHtml(review.id)}">Approve</button>`
          : "",
        status !== "rejected"
          ? `<button class="table-action" type="button" data-review-action="reject" data-review-id="${escapeHtml(review.id)}">Reject</button>`
          : "",
        `<button class="danger-button" type="button" data-review-action="delete" data-review-id="${escapeHtml(review.id)}">Delete</button>`,
      ].filter(Boolean).join("");

      return `
        <article class="admin-review-card">
          <div class="review-card-top">
            <span class="status-badge status-${escapeHtml(status)}">${escapeHtml(status)}</span>
            <a href="../shop.html" class="review-product-link">${escapeHtml(review.productName || review.productId)}</a>
          </div>
          <div class="admin-review-stars">${escapeHtml(starText(review.rating))}</div>
          <div class="muted">
            <strong>${escapeHtml(review.customerName)}</strong>
            <span>${escapeHtml(formatDate(review.createdAt))}</span>
          </div>
          <p>${escapeHtml(review.reviewText)}</p>
          <div class="row-actions">${actions}</div>
        </article>
      `;
    }).join("") || '<p class="muted">No reviews match this filter.</p>';
    updateStats();
  };

  const loadProducts = async () => {
    products = await requestJson("/api/products");
    renderProducts();
  };

  const loadRequests = async () => {
    requests = await requestJson("/api/admin/custom-print-requests");
    renderRequests();
  };

  const loadOrders = async () => {
    orders = await requestJson("/api/admin/orders");
    renderOrders();
  };

  const loadReviews = async () => {
    reviews = await requestJson("/api/admin/reviews");
    renderReviews();
  };

  const loadAll = async () => {
    try {
      await Promise.all([loadProducts(), loadRequests(), loadOrders(), loadReviews()]);
    } catch (err) {
      if (err.message === "Unauthorized") {
        sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
        window.location.href = "login.html";
        return;
      }
      setMessage("product-message", err.message);
    }
  };

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach((tab) => tab.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(`${button.dataset.tab}-panel`).classList.add("active");
    });
  });

  productForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = productPayload();

    if (!payload.id || !payload.name || Number.isNaN(payload.price)) {
      setMessage("product-message", "ID, name, and price are required.");
      return;
    }

    const editingId = editingProductId.value;

    try {
      if (editingId) {
        await requestJson(`/api/admin/products/${encodeURIComponent(editingId)}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setMessage("product-message", "Product updated.");
      } else {
        await requestJson("/api/admin/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage("product-message", "Product created.");
      }

      resetProductForm();
      await loadProducts();
    } catch (err) {
      setMessage("product-message", err.message);
    }
  });

  productsTable.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-product]");
    const deleteButton = event.target.closest("[data-delete-product]");

    if (editButton) {
      const product = products.find((item) => item.id === editButton.dataset.editProduct);
      if (!product) return;

      editingProductId.value = product.id;
      productId.value = product.id;
      productId.disabled = true;
      productName.value = product.name || "";
      productPrice.value = product.price ?? "";
      productImage.value = product.image || "";
      productDescription.value = product.description || "";
      productFeatures.value = (product.features || []).join("\n");
      productFeatured.checked = !!product.featured;
      productFormTitle.textContent = "Edit Product";
      setMessage("product-message", "");
      return;
    }

    if (deleteButton) {
      const id = deleteButton.dataset.deleteProduct;
      if (!window.confirm(`Delete product "${id}"?`)) return;

      try {
        await requestJson(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
        await loadProducts();
      } catch (err) {
        setMessage("product-message", err.message);
      }
    }
  });

  document.getElementById("reset-product-form").addEventListener("click", resetProductForm);
  document.getElementById("refresh-products").addEventListener("click", loadProducts);
  document.getElementById("refresh-requests").addEventListener("click", loadRequests);
  document.getElementById("refresh-orders").addEventListener("click", loadOrders);
  document.getElementById("refresh-reviews").addEventListener("click", loadReviews);
  document.querySelectorAll(".review-filter").forEach((button) => {
    button.addEventListener("click", () => {
      reviewFilter = button.dataset.reviewFilter;
      renderReviews();
    });
  });
  reviewsList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-review-action]");

    if (!button) {
      return;
    }

    const { reviewAction, reviewId } = button.dataset;

    if (reviewAction === "delete" && !window.confirm("Delete this review?")) {
      return;
    }

    try {
      const url = reviewAction === "delete"
        ? `/api/admin/reviews/${encodeURIComponent(reviewId)}`
        : `/api/admin/reviews/${encodeURIComponent(reviewId)}/${reviewAction}`;

      await requestJson(url, { method: reviewAction === "delete" ? "DELETE" : "PUT" });
      setMessage("reviews-message", "");
      await loadReviews();
    } catch (err) {
      setMessage("reviews-message", err.message);
    }
  });
  document.getElementById("logout-button").addEventListener("click", () => {
    sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
    window.location.href = "login.html";
  });

  loadAll();
};

document.addEventListener("DOMContentLoaded", () => {
  setupLogin();
  setupDashboard();
});
