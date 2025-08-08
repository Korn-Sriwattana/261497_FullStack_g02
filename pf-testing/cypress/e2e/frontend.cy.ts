before(() => {
  const url = Cypress.env("BACKEND_URL");
  cy.request({
    method: "POST",
    url: `${url}/todo/all`,
  });
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

    // ตรวจว่าไม่มี todo ใหม่ถูกเพิ่ม (ใช้ class ของ item จริง ๆ)
    cy.get("[data-cy='todo-item']").should("not.exist");
  });

  it("can create a tag", () => {
    const url = Cypress.env("FRONTEND_URL");
    const tagName = `Tag_${Date.now()}`;
    cy.visit(url);

    // เปิด dropdown
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

    // เปิด dropdown สร้าง tag ใหม่
    cy.get("[data-cy='tag-select']").click();
    cy.get("[data-cy='add-tag-input']").type(tagName);
    cy.get("[data-cy='tag-add-button']").click();

    // รอให้ tag ใหม่แสดงในรายการ
    cy.contains(tagName).should("exist");

    // พิมพ์ข้อความ todo
    cy.get("[data-cy='input-text']").type(text);

    // เปิด dropdown เพื่อเลือก tag
    cy.get("[data-cy='tag-select']").click();

    // เลือก tag ที่สร้างไว้
    cy.get("[data-cy^='tag-item-']").contains(tagName).click();

    // กด submit
    cy.get("[data-cy='submit']").click();

    // ตรวจสอบว่า todo แสดงและมี tag ตามที่เลือกไว้
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

    // เปิด dropdown สร้าง tag ใหม่
    cy.get("[data-cy='tag-select']").click();
    cy.get("[data-cy='add-tag-input']").type(tagName);
    cy.get("[data-cy='tag-add-button']").click();

    // รอ tag ใหม่แสดงในรายการ
    cy.contains(tagName).should("exist");

    // หา li ที่มีชื่อ tagName แล้วกดปุ่ม delete ที่อยู่ใน li นั้น
    cy.get("[data-cy^='tag-item-']")
      .contains(tagName)
      .parents("li")
      .within(() => {
        cy.get("button").should("exist").click();
      });

    // ตรวจสอบว่า tag หายไปแล้ว
    cy.contains(tagName).should("not.exist");
  });

  it("fails to delete tag if todos use it", () => {
    const url = Cypress.env("FRONTEND_URL");
    const tagName = `UsedTag_${Date.now()}`;
    const todoText = `Todo_${Date.now()}`;
    cy.visit(url);

    // เปิด dropdown สร้าง tag ใหม่
    cy.get("[data-cy='tag-select']").click();
    cy.get("[data-cy='add-tag-input']").type(tagName);
    cy.get("[data-cy='tag-add-button']").click();

    // รอ tag ใหม่แสดงในรายการ
    cy.contains(tagName).should("exist");

    // สร้าง todo ที่ใช้ tag นี้
    cy.get("[data-cy='input-text']").type(todoText);
    cy.get("[data-cy='tag-select']").click();
    cy.get("[data-cy^='tag-item-']").contains(tagName).click();
    cy.get("[data-cy='submit']").click();

    // เปิด dropdown อีกครั้งเพื่อทดสอบลบ tag ที่ถูกใช้
    cy.get("[data-cy='tag-select']").click();

    // หา tag ที่ชื่อ UsedTag และเช็คปุ่ม delete ว่าถูก disabled
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

    // สร้าง tag ใหม่
    cy.get("[data-cy='tag-select']").click();
    cy.get("[data-cy='add-tag-input']").type(tagName);
    cy.get("[data-cy='tag-add-button']").click();
    cy.contains(tagName).should("exist");

    // สร้าง todo ใหม่ พร้อมกับใช้ tag นั้น
    cy.get("[data-cy='input-text']").type(todoText);
    cy.get("[data-cy='tag-select']").click();
    cy.get("[data-cy^='tag-item-']").contains(tagName).click();
    cy.get("[data-cy='submit']").click();

    // ตรวจสอบว่า todo ถูกสร้าง
    cy.contains(todoText).should("exist");

    // เลือก tag ที่เพิ่งสร้างใน dropdown filter
    cy.get("[data-cy='filter-tag-select']").select(tagName);

    // ตรวจสอบว่าแสดงเฉพาะ todo ที่มี tag นั้น
    cy.get("[data-cy='todo-item-wrapper']").should("have.length", 1);
    cy.get("[data-cy='todo-item-wrapper']").contains(todoText);
  });

  it("can toggle todo status and filter by DONE / UNDONE / ALL", () => {
    const url = Cypress.env("FRONTEND_URL");
    const doneText = `Done Todo ${Date.now()}`;
    const undoneText = `Undone Todo ${Date.now() + 1}`;
    cy.visit(url);

    // สร้าง todo ที่จะถูกทำให้เสร็จ (Done)
    cy.get("[data-cy='input-text']").type(doneText);
    cy.get("[data-cy='submit']").click();

    // สร้าง todo ที่ยังไม่เสร็จ (Undone)
    cy.get("[data-cy='input-text']").type(undoneText);
    cy.get("[data-cy='submit']").click();

    // ตรวจสอบว่าทั้ง 2 todo ถูกสร้าง
    cy.contains(doneText).should("exist");
    cy.contains(undoneText).should("exist");

    // ทำเครื่องหมายให้ Done สำหรับ todo แรก
    cy.contains(doneText)
      .parents("[data-cy='todo-item']")
      .within(() => {
        cy.get("input[type='checkbox']").check();
      });

    // ✅ Filter: แสดงเฉพาะที่ "DONE"
    cy.get("select[data-cy='filter-tag-select']")
      .parent()
      .siblings()
      .contains("Status")
      .parent()
      .within(() => {
        cy.get("[data-cy='filter-status-select']").select("DONE");
      });

    // ตรวจสอบว่าแสดงเฉพาะ todo ที่ถูกทำเสร็จ
    cy.contains(doneText).should("exist");
    cy.contains(undoneText).should("not.exist");

    // ✅ Filter: แสดงเฉพาะที่ "UNDONE"
    cy.get("select[data-cy='filter-tag-select']")
      .parent()
      .siblings()
      .contains("Status")
      .parent()
      .within(() => {
        cy.get("[data-cy='filter-status-select']").select("UNDONE");
      });

    // ตรวจสอบว่าแสดงเฉพาะ todo ที่ยังไม่เสร็จ
    cy.contains(doneText).should("not.exist");
    cy.contains(undoneText).should("exist");

    // ✅ Filter: แสดงทั้งหมด (ALL)
    cy.get("select[data-cy='filter-tag-select']")
      .parent()
      .siblings()
      .contains("Status")
      .parent()
      .within(() => {
        cy.get("[data-cy='filter-status-select']").select("ALL");
      });

    // ตรวจสอบว่าทั้งสอง todo แสดงครบ
    cy.contains(doneText).should("exist");
    cy.contains(undoneText).should("exist");
  });
});
