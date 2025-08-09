before(() => {
  const url = Cypress.env("BACKEND_URL");
  cy.request({ method: "POST", url: `${url}/todo/all` });
});

beforeEach(() => {
  const url = Cypress.env("BACKEND_URL");
  cy.request("POST", `${url}/todo/all`);
  cy.request("POST", `${url}/tags/unused`);
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
  // New: frontend auth flow
  // =====================
  it("registers & logs in via popup, then creates an owned todo", () => {
    const fe = Cypress.env("FRONTEND_URL");
    const be = Cypress.env("BACKEND_URL");
    const username = `fe_user_${Date.now()}`;
    const todoText = `Owned_${Date.now()}`;

    cy.visit(fe);

    cy.get("[data-cy='auth-open']").click();
    cy.get("[data-cy='auth-username']").type(username);
    cy.get("[data-cy='auth-password']").type("p@ssw0rd");
    cy.get("[data-cy='auth-register']").click();

    // อาจมี alert จาก register -> ปิดได้
    cy.on("window:alert", () => true);

    // login
    cy.get("[data-cy='auth-login']").click();
    cy.get("[data-cy='auth-close']").click();
    cy.get("[data-cy='auth-greeting']").should("contain", username);

    // create todo
    cy.get("[data-cy='input-text']").type(todoText);
    cy.get("[data-cy='submit']").click();
    cy.contains(todoText).should("exist");

    // ตรวจ owner ผ่าน backend API
    cy.request(`${be}/todo`).then((res) => {
      const t = res.body.find((r: any) => r.todoText === todoText);
      expect(t).to.have.property("ownerId").and.to.be.a("string");
    });
  });
});
