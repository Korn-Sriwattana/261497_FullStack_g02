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
    const plus3 = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    cy.get("[data-cy='input-date']").clear().type(plus3);
    cy.get("[data-cy='submit']").click();
    const t2 = `A_${Date.now()}_2`;
    openForm();
    cy.get("[data-cy='input-text']").clear().type(t2);
    const plus1 = new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10);
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
    tag-item-']").contains(tagName).click();
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
