before(() => {
  const url = Cypress.env("BACKEND_URL");
  cy.request({ method: "POST", url: `${url}/todo/all` });
});

beforeEach(() => {
  const url = Cypress.env("BACKEND_URL");
  cy.request("POST", `${url}/todo/all`);
});

describe("Frontend", () => {
  it("connects", () => {
    const url = Cypress.env("FRONTEND_URL");
    cy.visit(url);
  });

  it("creates todo", () => {
    const url = Cypress.env("FRONTEND_URL");
    const text = new Date().getTime().toString();
    cy.visit(url);
    cy.get("[data-cy='input-text']").type(text);
    cy.get("[data-cy='submit']").click();
    cy.contains(text).should("exist");
  });

  it("deletes todo", () => {
    const url = Cypress.env("FRONTEND_URL");
    const text = new Date().getTime().toString();
    cy.visit(url);
    cy.get("[data-cy='input-text']").type(text);
    cy.get("[data-cy='submit']").click();

    cy.contains(text)
      .should("exist")
      .parents("[data-cy='todo-item']")
      .within(() => {
        cy.get("[data-cy='todo-item-delete']").should("exist").click();
      });

    cy.contains(text).should("not.exist");
  });

  it("updates todo", () => {
    const url = Cypress.env("FRONTEND_URL");
    const text = new Date().getTime().toString();
    const textUpdated = "123456";
    cy.visit(url);
    cy.get("[data-cy='input-text']").type(text);
    cy.get("[data-cy='submit']").click();

    cy.contains(text)
      .should("exist")
      .parents("[data-cy='todo-item']")
      .within(() => {
        cy.get("[data-cy='todo-item-update']").should("exist").click();
      });

    cy.get("[data-cy='input-text']").clear().type(textUpdated);
    cy.get("[data-cy='submit']").click();
    cy.contains(textUpdated).should("exist");
    cy.contains(text).should("not.exist");
  });

  it("should not allow empty todo", () => {
    const url = Cypress.env("FRONTEND_URL");
    cy.visit(url);
    cy.get("[data-cy='submit']").click();
    cy.get("[data-cy='todo-item']").should("not.exist");
  });

  it("can create a tag", () => {
    const url = Cypress.env("FRONTEND_URL");
    const tagName = `Tag_${Date.now()}`;
    cy.visit(url);

    cy.get("[data-cy='tag-select']").click();
    cy.get("[data-cy='add-tag-input']").type(tagName);
    cy.get("[data-cy='tag-add-button']").click();
    cy.contains(tagName).should("exist");
  });

  it("creates todo with selected tag", () => {
    const url = Cypress.env("FRONTEND_URL");
    const tagName = `Selected_Tag_${Date.now()}`;
    const text = new Date().getTime().toString();
    cy.visit(url);

    cy.get("[data-cy='tag-select']").click();
    cy.get("[data-cy='add-tag-input']").type(tagName);
    cy.get("[data-cy='tag-add-button']").click();

    cy.contains(tagName).should("exist");

    cy.get("[data-cy='input-text']").type(text);
    cy.get("[data-cy='tag-select']").click();
    cy.get("[data-cy^='tag-item-']").contains(tagName).click();
    cy.get("[data-cy='submit']").click();

    cy.get("[data-cy='todo-item']").within(() => {
      cy.contains(text).should("exist");
    });

    cy.get("[data-cy='todo-item']").within(() => {
      cy.get("[data-cy='todo-tag']").should("contain", tagName);
    });
  });

  it("can delete an unused tag", () => {
    const url = Cypress.env("FRONTEND_URL");
    const tagName = `DeletableTag_${Date.now()}`;
    cy.visit(url);

    cy.get("[data-cy='tag-select']").click();
    cy.get("[data-cy='add-tag-input']").type(tagName);
    cy.get("[data-cy='tag-add-button']").click();

    cy.contains(tagName).should("exist");

    cy.get("[data-cy^='tag-item-']")
      .contains(tagName)
      .parents("li")
      .within(() => {
        cy.get("button").should("exist").click();
      });

    cy.contains(tagName).should("not.exist");
  });

  it("fails to delete tag if todos use it", () => {
    const url = Cypress.env("FRONTEND_URL");
    const tagName = `UsedTag_${Date.now()}`;
    const todoText = `Todo_${Date.now()}`;
    cy.visit(url);

    cy.get("[data-cy='tag-select']").click();
    cy.get("[data-cy='add-tag-input']").type(tagName);
    cy.get("[data-cy='tag-add-button']").click();
    cy.contains(tagName).should("exist");

    cy.get("[data-cy='input-text']").type(todoText);
    cy.get("[data-cy='tag-select']").click();
    cy.get("[data-cy^='tag-item-']").contains(tagName).click();
    cy.get("[data-cy='submit']").click();

    cy.get("[data-cy='tag-select']").click();
    cy.get("[data-cy^='tag-item-']")
      .contains(tagName)
      .parent()
      .within(() => {
        cy.get("button").should("have.attr", "disabled");
      });
  });

  it("filters todos by selected tag correctly", () => {
    const url = Cypress.env("FRONTEND_URL");
    const tagName = `FilterTag_${Date.now()}`;
    const todoText = `Test Todo ${Date.now()}`;
    cy.visit(url);

    cy.get("[data-cy='tag-select']").click();
    cy.get("[data-cy='add-tag-input']").type(tagName);
    cy.get("[data-cy='tag-add-button']").click();
    cy.contains(tagName).should("exist");

    cy.get("[data-cy='input-text']").type(todoText);
    cy.get("[data-cy='tag-select']").click();
    cy.get("[data-cy^='tag-item-']").contains(tagName).click();
    cy.get("[data-cy='submit']").click();

    cy.contains(todoText).should("exist");

    cy.get("[data-cy='filter-tag-select']").select(tagName);

    cy.get("[data-cy='todo-item-wrapper']").contains(todoText);
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
