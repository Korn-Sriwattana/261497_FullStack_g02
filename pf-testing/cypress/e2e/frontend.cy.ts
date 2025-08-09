// cypress/e2e/frontend.cy.ts

before(() => {
  const url = Cypress.env("BACKEND_URL");
  cy.request({ method: "POST", url: `${url}/todo/all` });
});

beforeEach(() => {
  const url = Cypress.env("BACKEND_URL");
  cy.request("POST", `${url}/todo/all`);
  cy.request("POST", `${url}/tags/unused`);
});

const visitFE = () => cy.visit(Cypress.env("FRONTEND_URL"));

const openForm = () => {
  cy.get("body", { timeout: 10000 }).then(($b) => {
    if ($b.find("[data-cy='input-text']").length) return;
    const clickFirst = (sel: string) =>
      cy.get(sel, { timeout: 2000 }).first().click({ force: true });
    if ($b.find("[data-cy='add-task-btn']").length) {
      clickFirst("[data-cy='add-task-btn']");
    } else if ($b.find(".add-inline-btn").length) {
      clickFirst(".add-inline-btn");
    } else if ($b.find(".add-btn").length) {
      clickFirst(".add-btn");
    } else if ($b.text().includes("+ Add Task")) {
      cy.contains("+ Add Task", { timeout: 2000 }).click({ force: true });
    } else {
      cy.contains("+ Add task", { timeout: 2000 }).click({ force: true });
    }
  });
};

const openTagDropdown = () => {
  openForm();
  cy.get("[data-cy='tag-select']", { timeout: 6000 })
    .first()
    .scrollIntoView()
    .should("be.visible")
    .click({ force: true });

  cy.get("body").then(($b) => {
    if ($b.find(".tagdd-panel").length === 0) {
      cy.get("[data-cy='tag-select']").first().click({ force: true });
    }
  });

  cy.get(".tagdd-panel", { timeout: 6000 }).should("exist").and("be.visible");
};

const openSortMenu = () => cy.contains("sort by").click();
const chooseSort = (key: "created" | "due date") =>
  cy.contains(".menu .menu-item", key).click();
const openFilterMenu = () => cy.contains("filter").click();
const chooseStatus = (label: "all" | "done" | "not done") =>
  cy.contains(".menu .menu-item", label).click();
const chooseTagFromFilter = (name: string) =>
  cy.contains(".menu .menu-item", name).click();

const rowByText = (txt: string) =>
  cy.contains("[data-cy='todo-item-wrapper']", txt);

const clickDeleteInRow = (txt: string) =>
  rowByText(txt)
    .find("[data-cy='todo-item-delete'], .icon-btn.del")
    .first()
    .click({ force: true });

const clickEditInRow = (txt: string) =>
  rowByText(txt)
    .find("[data-cy='todo-item-update'], .icon-btn.edit")
    .first()
    .click({ force: true });

describe("Frontend", () => {
  it("connects", () => {
    visitFE();
  });

  it("creates todo", () => {
    visitFE();
    openForm();
    const text = Date.now().toString();
    cy.get("[data-cy='input-text']").type(text);
    cy.get("[data-cy='submit']").click();
    cy.contains(text).should("exist");
  });

  it("deletes todo", () => {
    visitFE();
    openForm();
    const text = Date.now().toString();
    cy.get("[data-cy='input-text']").type(text);
    cy.get("[data-cy='submit']").click();
    clickDeleteInRow(text);
    cy.contains(text).should("not.exist");
  });

  it("updates todo", () => {
    visitFE();
    openForm();
    const text = Date.now().toString();
    const textUpdated = "123456";
    cy.get("[data-cy='input-text']").type(text);
    cy.get("[data-cy='submit']").click();
    clickEditInRow(text);
    cy.get("[data-cy='input-text']").clear().type(textUpdated);
    cy.get("[data-cy='submit']").click();
    cy.contains(textUpdated).should("exist");
    cy.contains(text).should("not.exist");
  });

  it("should not allow empty todo", () => {
    visitFE();
    openForm();
    cy.get("[data-cy='submit']").click();
    cy.get("[data-cy='todo-item']").should("not.exist");
  });

  it("can create a tag", () => {
    visitFE();
    openForm();
    const tagName = `Tag_${Date.now()}`;
    openTagDropdown();
    cy.get("[data-cy='add-tag-input']").type(tagName);
    cy.get("[data-cy='tag-add-button']").click();
    cy.contains(tagName).should("exist");
  });

  it("creates todo with selected tag", () => {
    visitFE();
    openForm();
    const tagName = `Selected Tag`;
    openTagDropdown();
    cy.get("[data-cy='add-tag-input']").type(tagName);
    cy.get("[data-cy='tag-add-button']").click();
    cy.get("[data-cy^='tag-item-']").contains(tagName).should("exist");
    const text = Date.now().toString();
    cy.get("[data-cy='input-text']").type(text);
    openTagDropdown();
    cy.get("[data-cy^='tag-item-']").contains(tagName).click();
    cy.get("[data-cy='submit']").click();
    rowByText(text).find("[data-cy='todo-tag']").should("contain", tagName);
  });

  it("can delete an unused tag", () => {
    visitFE();
    openForm();
    const tagName = `DeletableTag_${Date.now()}`;
    openTagDropdown();
    cy.get("[data-cy='add-tag-input']").type(tagName);
    cy.get("[data-cy='tag-add-button']").click();
    cy.get("[data-cy^='tag-item-']").contains(tagName).should("exist");
    cy.get("[data-cy^='tag-item-']")
      .contains(tagName)
      .parents("li")
      .find("[data-cy^='tag-item-del-']")
      .first()
      .click();
    cy.contains(tagName).should("not.exist");
  });

  it("fails to delete tag if todos use it", () => {
    visitFE();
    openForm();
    const tagName = `UsedTag`;
    openTagDropdown();
    cy.get("[data-cy='add-tag-input']").type(tagName);
    cy.get("[data-cy='tag-add-button']").click();
    cy.get("[data-cy^='tag-item-']").contains(tagName).should("exist");
    const todoText = `Todo_${Date.now()}`;
    cy.get("[data-cy='input-text']").type(todoText);
    openTagDropdown();
    cy.get("[data-cy^='tag-item-']").contains(tagName).click();
    cy.get("[data-cy='submit']").click();
    openForm();
    openTagDropdown();
    cy.get("[data-cy^='tag-item-']")
      .contains(tagName)
      .parents("li")
      .find("[data-cy^='tag-item-del-']")
      .first()
      .should("have.attr", "disabled");
  });

  it("sorts by due date (ascending, empty due at end)", () => {
    visitFE();
    const t1 = `A_${Date.now()}_1`;
    openForm();
    cy.get("[data-cy='input-text']").clear().type(t1);
    const plus3 = new Date(Date.now() + 3 * 86400000)
      .toISOString()
      .slice(0, 10);
    cy.get("[data-cy='input-date']").clear().type(plus3);
    cy.get("[data-cy='submit']").click();
    const t2 = `A_${Date.now()}_2`;
    openForm();
    cy.get("[data-cy='input-text']").clear().type(t2);
    const plus1 = new Date(Date.now() + 1 * 86400000)
      .toISOString()
      .slice(0, 10);
    cy.get("[data-cy='input-date']").clear().type(plus1);
    cy.get("[data-cy='submit']").click();
    const t3 = `A_${Date.now()}_3`;
    openForm();
    cy.get("[data-cy='input-text']").clear().type(t3);
    cy.get("[data-cy='submit']").click();
    openSortMenu();
    chooseSort("due date");
    cy.get("[data-cy='todo-item-wrapper']").then(($rows) => {
      const texts = [...$rows].map((el) => el.textContent || "");
      const idx1 = texts.findIndex((s) => s.includes(t1));
      const idx2 = texts.findIndex((s) => s.includes(t2));
      const idx3 = texts.findIndex((s) => s.includes(t3));
      expect(idx2).to.be.lessThan(idx1);
      expect(idx3).to.be.greaterThan(idx1);
    });
  });

  it("sorts by created (oldest first)", () => {
    visitFE();
    const a = `C_${Date.now()}_a`;
    openForm();
    cy.get("[data-cy='input-text']").type(a);
    cy.get("[data-cy='submit']").click();
    const b = `C_${Date.now()}_b`;
    openForm();
    cy.get("[data-cy='input-text']").type(b);
    cy.get("[data-cy='submit']").click();
    openSortMenu();
    chooseSort("created");
    cy.get("[data-cy='todo-item-wrapper']").then(($rows) => {
      const texts = [...$rows].map((el) => el.textContent || "");
      const ia = texts.findIndex((s) => s.includes(a));
      const ib = texts.findIndex((s) => s.includes(b));
      expect(ia).to.be.lessThan(ib);
    });
  });

  it("filters by status: done / not done / all", () => {
    visitFE();
    const one = `S_${Date.now()}_1`;
    openForm();
    cy.get("[data-cy='input-text']").type(one);
    cy.get("[data-cy='submit']").click();
    const two = `S_${Date.now()}_2`;
    openForm();
    cy.get("[data-cy='input-text']").type(two);
    cy.get("[data-cy='submit']").click();
    rowByText(one).find("input[type='checkbox']").check({ force: true });
    openFilterMenu();
    chooseStatus("done");
    cy.contains(one).should("exist");
    cy.contains(two).should("not.exist");
    openFilterMenu();
    chooseStatus("not done");
    cy.contains(two).should("exist");
    cy.contains(one).should("not.exist");
    openFilterMenu();
    chooseStatus("all");
    cy.contains(one).should("exist");
    cy.contains(two).should("exist");
  });

  it("filters by tag from the filter menu", () => {
    visitFE();
    openForm();
    const tagName = `FilterMenuTag_${Date.now()}`;
    const text = `FM_${Date.now()}`;
    openTagDropdown();
    cy.get("[data-cy='add-tag-input']").type(tagName);
    cy.get("[data-cy='tag-add-button']").click();
    cy.contains(tagName).should("exist");
    cy.get("[data-cy='input-text']").type(text);
    openTagDropdown();
    cy.get("[data-cy='tag-item']").contains(tagName).click();
    cy.get("[data-cy='submit']").click();
    cy.contains(text).should("exist");
    openFilterMenu();
    chooseTagFromFilter(tagName);
    cy.get("[data-cy='todo-item-wrapper']").should("have.length", 1);
    cy.get("[data-cy='todo-item-wrapper']").contains(text);
  });

  it("closes menus when clicking outside", () => {
    visitFE();
    openSortMenu();
    cy.get(".menu").should("exist");
    cy.get("body").click(0, 0);
    cy.get(".menu").should("not.exist");
    openFilterMenu();
    cy.get(".menu").should("exist");
    cy.get("body").click(0, 0);
    cy.get(".menu").should("not.exist");
  });

  it("cancels add task with Escape", () => {
    visitFE();
    openForm();
    cy.get("[data-cy='input-text']").type("should-not-create");
    cy.get("body").type("{esc}");
    cy.contains("should-not-create").should("not.exist");
  });

  it("creates todo with due date and displays it", () => {
    visitFE();
    openForm();
    const text = `DUE_${Date.now()}`;
    const due = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    cy.get("[data-cy='input-text']").type(text);
    cy.get("[data-cy='input-date']").clear().type(due);
    cy.get("[data-cy='submit']").click();
    rowByText(text).contains("📅");
  });

  it("persists done state after reload", () => {
    visitFE();
    openForm();
    const text = `PERSIST_${Date.now()}`;
    cy.get("[data-cy='input-text']").type(text);
    cy.get("[data-cy='submit']").click();
    rowByText(text).find("input[type='checkbox']").check({ force: true });
    cy.reload();
    rowByText(text).find("input[type='checkbox']").should("be.checked");
  });

  it("edits due date of an existing todo", () => {
    visitFE();
    const txt = `EDIT_DUE_${Date.now()}`;
    openForm();
    cy.get("[data-cy='input-text']").type(txt);
    const due1 = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    cy.get("[data-cy='input-date']").clear().type(due1);
    cy.get("[data-cy='submit']").click();
    clickEditInRow(txt);
    const due2 = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    cy.get("[data-cy='input-date']").clear().type(due2);
    cy.get("[data-cy='submit']").click();
    rowByText(txt).contains("📅");
  });

  it("changes tag of an existing todo", () => {
    visitFE();
    const txt = `EDIT_TAG_${Date.now()}`;
    const tagA = `TagA_${Date.now()}`;
    const tagB = `TagB_${Date.now()}`;
    openForm();
    openTagDropdown();
    cy.get("[data-cy='add-tag-input']").type(tagA);
    cy.get("[data-cy='tag-add-button']").click();
    openTagDropdown();
    cy.get("[data-cy='add-tag-input']").type(tagB);
    cy.get("[data-cy='tag-add-button']").click();
    cy.get("[data-cy='input-text']").type(txt);
    openTagDropdown();
    cy.contains("[data-cy^='tag-item-']", tagA).click();
    cy.get("[data-cy='submit']").click();
    rowByText(txt).find("[data-cy='todo-tag']").should("contain", tagA);
    clickEditInRow(txt);
    openTagDropdown();
    cy.contains("[data-cy^='tag-item-']", tagB).click();
    cy.get("[data-cy='submit']").click();
    rowByText(txt).find("[data-cy='todo-tag']").should("contain", tagB);
  });

  it("edge: empty state + menus still open/close correctly", () => {
    visitFE();
    cy.contains("+ Add task");
    openSortMenu();
    cy.get(".menu").should("exist");
    cy.get("body").click(0, 0);
    cy.get(".menu").should("not.exist");
    openFilterMenu();
    cy.get(".menu").should("exist");
    cy.get("body").click(0, 0);
    cy.get(".menu").should("not.exist");
  });

  it("edge: many items still sort and filter correctly", () => {
    visitFE();
    const tagName = `BulkTag_${Date.now()}`;
    openForm();
    openTagDropdown();
    cy.get("[data-cy='add-tag-input']").type(tagName);
    cy.get("[data-cy='tag-add-button']").click();
    const N = 15;
    for (let i = 0; i < N; i++) {
      const text = `BULK_${Date.now()}_${i}`;
      openForm();
      cy.get("[data-cy='input-text']").type(text);
      if (i < 5) {
        const due = new Date(Date.now() + (i + 1) * 86400000)
          .toISOString()
          .slice(0, 10);
        cy.get("[data-cy='input-date']").clear().type(due);
      }
      if (i % 3 === 0) {
        openTagDropdown();
        cy.contains("[data-cy^='tag-item-']", tagName).click();
      }
      cy.get("[data-cy='submit']").click();
    }
    openSortMenu();
    chooseSort("due date");
    cy.get("[data-cy='todo-item-wrapper']").its("length").should("be.gte", N);
    openFilterMenu();
    chooseTagFromFilter(tagName);
    cy.get("[data-cy='todo-item-wrapper']").each(($el) => {
      cy.wrap($el).find("[data-cy='todo-tag']").should("contain", tagName);
    });
  });

  it("can toggle todo status and filter by DONE / UNDONE / ALL", () => {
    const url = Cypress.env("FRONTEND_URL");
    const doneText = `Done Todo ${Date.now()}`;
    const undoneText = `Undone Todo ${Date.now() + 1}`;
    cy.visit(url);

    cy.get("[data-cy='input-text']").type(doneText);
    cy.get("[data-cy='submit']").click();

    cy.get("[data-cy='input-text']").type(undoneText);
    cy.get("[data-cy='submit']").click();

    cy.contains(doneText)
      .parents("[data-cy='todo-item']")
      .within(() => {
        cy.get("input[type='checkbox']").check();
      });

    cy.get("select[data-cy='filter-tag-select']")
      .parent()
      .siblings()
      .contains("Status")
      .parent()
      .within(() => {
        cy.get("[data-cy='filter-status-select']").select("DONE");
      });
    cy.contains(doneText).should("exist");
    cy.contains(undoneText).should("not.exist");

    cy.get("select[data-cy='filter-tag-select']")
      .parent()
      .siblings()
      .contains("Status")
      .parent()
      .within(() => {
        cy.get("[data-cy='filter-status-select']").select("UNDONE");
      });
    cy.contains(doneText).should("not.exist");
    cy.contains(undoneText).should("exist");

    cy.get("select[data-cy='filter-tag-select']")
      .parent()
      .siblings()
      .contains("Status")
      .parent()
      .within(() => {
        cy.get("[data-cy='filter-status-select']").select("ALL");
      });
    cy.contains(doneText).should("exist");
    cy.contains(undoneText).should("exist");
  });

  // =====================
  // Frontend auth flow (stable, no hard close)
  // =====================
  it("registers via API, logs in via popup, then creates an owned todo", () => {
    const fe = Cypress.env("FRONTEND_URL");
    const be = Cypress.env("BACKEND_URL");
    const username = `fe_user_${Date.now()}`;
    const password = "p@ssw0rd";
    const todoText = `Owned_${Date.now()}`;

    // สมัครผ่าน backend กัน race
    cy.request("POST", `${be}/auth/register`, { username, password })
      .its("status")
      .should("eq", 200);

    // intercept เพื่อตรวจจังหวะ login & me
    cy.intercept("POST", "/api/auth/login").as("apiLogin");
    cy.intercept("GET", "/api/auth/me*").as("apiMe");

    cy.visit(fe);

    // เปิด modal + กรอก + login
    cy.get("[data-cy='auth-open']").click();
    cy.get("[data-cy='auth-username']").clear().type(username);
    cy.get("[data-cy='auth-password']").clear().type(password);
    cy.get("[data-cy='auth-login']").click();

    // รอ login 200
    cy.wait("@apiLogin").its("response.statusCode").should("eq", 200);
    // รอ me ถูกเรียกอย่างน้อยหนึ่งครั้งหลัง login
    cy.wait("@apiMe");

    // ชัวร์ด้วยการตรวจ me โดยตรง (user ต้องไม่ใช่ null)
    cy.request(`${fe}/api/auth/me`).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.user).to.have.property("username", username);
    });

    // header ต้องโชว์ชื่อผู้ใช้
    cy.get("[data-cy='auth-greeting']", { timeout: 10000 }).should(
      "contain",
      username
    );

    // สร้าง todo และเช็คในหน้า
    cy.get("[data-cy='input-text']").type(todoText);
    cy.get("[data-cy='submit']").click();
    cy.contains(todoText).should("exist");

    // ตรวจ owner ผ่าน FE origin (พกคุกกี้)
    cy.request(`${fe}/api/todo`).then((res) => {
      const t = res.body.find((r: any) => r.todoText === todoText);
      expect(t).to.have.property("ownerId").and.to.be.a("string");
    });
  });

  function uiLogin(username: string, password: string) {
    cy.intercept("POST", "/api/auth/login").as("apiLogin");
    cy.intercept("GET", "/api/auth/me*").as("apiMe");

    cy.get("[data-cy='auth-open']").click();
    cy.get("[data-cy='auth-username']").clear().type(username);
    cy.get("[data-cy='auth-password']").clear().type(password);
    cy.get("[data-cy='auth-login']").click();
    cy.wait("@apiLogin").its("response.statusCode").should("eq", 200);
    cy.wait("@apiMe");

    cy.get("body").then(($b) => {
      const $close = $b.find("[data-cy='auth-close']");
      if ($close.length) cy.wrap($close).click();
    });

    cy.get("[data-cy='auth-greeting']", { timeout: 10000 }).should(
      "contain",
      username
    );
  }

  function uiLogoutIfNeeded() {
    cy.request(`${Cypress.env("FRONTEND_URL")}/api/auth/me`).then((res) => {
      if (res.body?.user) {
        cy.get("[data-cy='auth-logout']").click({ force: true });
        cy.request(`${Cypress.env("FRONTEND_URL")}/api/auth/me`)
          .its("body.user")
          .should("eq", null);
      }
    });
  }

  // ==== Helpers สำหรับ policy test ====
  const fe = Cypress.env("FRONTEND_URL");
  const be = Cypress.env("BACKEND_URL");

  function assertLoggedIn(username: string) {
    // ยืนยัน session ผ่าน /api/auth/me แล้วค่อยตรวจ greeting
    cy.request(`${fe}/api/auth/me`).its("status").should("eq", 200);
    cy.request(`${fe}/api/auth/me`, { retryOnStatusCodeFailure: true })
      .its("body.user.username")
      .should("eq", username);
    cy.get("[data-cy='auth-greeting']", { timeout: 10000 }).should(
      "contain",
      username
    );
  }

  function uiLogin(username: string, password: string) {
    // รอเฉพาะ POST /api/auth/login = 200 แล้ว "ไม่" แตะปุ่มปิดโมดัล
    cy.intercept("POST", "/api/auth/login").as("apiLogin");

    cy.get("[data-cy='auth-open']").click();
    cy.get("[data-cy='auth-username']").clear().type(username);
    cy.get("[data-cy='auth-password']").clear().type(password);
    cy.get("[data-cy='auth-login']").click();

    cy.wait("@apiLogin").its("response.statusCode").should("eq", 200);

    // ปล่อยให้โมดัลปิดเอง ไม่ต้อง .click() ปุ่มใดๆ
    assertLoggedIn(username);
  }

  function uiLogoutIfNeeded() {
    cy.request(`${fe}/api/auth/me`).then((res) => {
      if (res.body?.user) {
        cy.get("[data-cy='auth-logout']").click({ force: true });
        cy.request(`${fe}/api/auth/me`).its("body.user").should("eq", null);
      }
    });
  }

  // ==== Policy Tests ====

  it("Logged-in user sees ONLY their own todos (no public)", () => {
    const publicText = `Public_${Date.now()}`;
    const aUser = `A_${Date.now()}`;
    const pass = "p@ssw0rd";
    const aText = `A_own_${Date.now()}`;

    cy.request("PUT", `${be}/todo`, { todoText: publicText });
    cy.request("POST", `${be}/auth/register`, {
      username: aUser,
      password: pass,
    });

    cy.visit(fe);
    uiLogoutIfNeeded();
    uiLogin(aUser, pass);

    cy.get("[data-cy='input-text']").type(aText);
    cy.get("[data-cy='submit']").click();

    cy.contains(aText).should("exist");
    cy.contains(publicText).should("not.exist");
  });

  it("User B does not see User A's todos", () => {
    const pass = "p@ssw0rd";
    const aUser = `A_${Date.now()}`;
    const bUser = `B_${Date.now() + 1}`;
    const a1 = `A1_${Date.now()}`;

    cy.request("POST", `${be}/auth/register`, {
      username: aUser,
      password: pass,
    });
    cy.request("POST", `${be}/auth/login`, { username: aUser, password: pass });
    cy.request("PUT", `${be}/todo`, { todoText: a1 });

    cy.request("POST", `${be}/auth/register`, {
      username: bUser,
      password: pass,
    });

    cy.visit(fe);
    uiLogoutIfNeeded();
    uiLogin(bUser, pass);

    cy.contains(a1).should("not.exist");
  });

  it("Tag filter respects policy (own vs public)", () => {
    const pass = "p@ssw0rd";
    const user = `U_${Date.now()}`;
    const tagName = `T_${Date.now()}`;
    const publicText = `Public_${Date.now()}`;
    const ownText = `Own_${Date.now()}`;

    // 1) สร้าง tag และ public todo
    cy.request("POST", `${be}/tags`, { name: tagName }).then((r) => {
      const tagId = r.body.data.id;
      cy.request("PUT", `${be}/todo`, { todoText: publicText, tagId });

      // 2) สมัคร user ใหม่
      cy.request("POST", `${be}/auth/register`, {
        username: user,
        password: pass,
      });

      // 3) เข้า FE + login
      cy.visit(fe);
      uiLogoutIfNeeded();
      uiLogin(user, pass);

      // 4) สร้าง todo ของตัวเองที่ติด tag เดียวกัน
      cy.get("[data-cy='input-text']").type(ownText);
      cy.get("[data-cy='tag-select']").click();

      // ✅ แก้: รอ element ของ tag พร้อมกด
      cy.get(`[data-cy='tag-item-${tagId}']`)
        .should("exist")
        .should("be.visible")
        .first()
        .click();

      cy.get("[data-cy='submit']").click();

      // 5) กรองด้วย tag → ต้องเห็นของตัวเอง แต่ไม่เห็น public
      cy.get("[data-cy='filter-tag-select']").select(tagName);
      cy.contains(ownText).should("exist");
      cy.contains(publicText).should("not.exist");

      // 6) logout แล้วกรองใหม่ → ต้องเห็น public แต่ไม่เห็นของตัวเอง
      cy.get("[data-cy='auth-logout']").click({ force: true });
      cy.get("[data-cy='filter-tag-select']").select(tagName);

      // ใช้ should + timeout กัน element render ช้า
      cy.contains(publicText, { timeout: 5000 }).should("exist");
      cy.contains(ownText).should("not.exist");
    });
  });
});
