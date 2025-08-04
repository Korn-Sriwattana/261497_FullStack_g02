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
    cy.contains(text);
  });

  it("deletes todo", () => {
    const url = Cypress.env("FRONTEND_URL");

    const text = new Date().getTime().toString();
    cy.visit(url);
    cy.get("[data-cy='input-text']").type(text);
    cy.get("[data-cy='submit']").click();
    cy.get("[data-cy='todo-item-wrapper']")
      .contains(text)
      .parent()
      .within(() => {
        cy.get("[data-cy='todo-item-delete']").click();
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
    cy.get("[data-cy='todo-item-wrapper']")
      .contains(text)
      .parent()
      .within(() => {
        cy.get("[data-cy='todo-item-update']").click();
      });
    cy.get("[data-cy='input-text']").clear().type(textUpdated);
    cy.get("[data-cy='submit']").click();
    cy.contains(textUpdated);
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
    cy.visit("http://localhost:5173");

    const tagName = `Tag_${Date.now()}`;

    cy.get("[data-cy='tag-select']").click(); // เปิด dropdown
    cy.get("[data-cy='add-tag-input']").type(tagName);
    cy.get("[data-cy='tag-add-button']").click();
    cy.contains(tagName).should("exist");

  });

  it("creates todo with selected tag", () => {
    const url = Cypress.env("FRONTEND_URL");
    cy.visit(url);

    const tagName = `Selected Tag`;

    // เปิด dropdown สร้าง tag ใหม่
    cy.get("[data-cy='tag-select']").click();
    cy.get("[data-cy='add-tag-input']").type(tagName);
    cy.get("[data-cy='tag-add-button']").click();

    // รอให้ tag ใหม่แสดงในรายการ
    cy.get("[data-cy^='tag-item-']").contains(tagName).should("exist");

    const text = new Date().getTime().toString();

    // พิมพ์ข้อความ todo
    cy.get("[data-cy='input-text']").type(text);

    // เปิด dropdown เพื่อเลือก tag
    cy.get("[data-cy='tag-select']").click();

    // เลือก tag ที่สร้างไว้
    cy.get("[data-cy^='tag-item-']").contains(tagName).click();

    // กด submit
    cy.get("[data-cy='submit']").click();

    // ตรวจสอบ todo และ tag แสดง
    cy.get("[data-cy='todo-item-wrapper']")
      .contains(text)
      .parent()
      .within(() => {
        cy.get("[data-cy='todo-tag']").should("contain", tagName);
      });
  });


  it("can delete an unused tag", () => {
    cy.visit("http://localhost:5173");

    const tagName = `DeletableTag_${Date.now()}`;

    // เปิด dropdown สร้าง tag ใหม่
    cy.get("[data-cy='tag-select']").click();
    cy.get("[data-cy='add-tag-input']").type(tagName);
    cy.get("[data-cy='tag-add-button']").click();

    // รอ tag ใหม่แสดงในรายการ
    cy.get("[data-cy^='tag-item-']").contains(tagName).should("exist");

    // หา li ที่มีชื่อ tagName แล้วกดปุ่ม delete ที่อยู่ใน li นั้น
    cy.get("[data-cy^='tag-item-']")
      .contains(tagName)
      .parents("li")
      .within(() => {
        cy.get("button").click();  // กดปุ่ม delete (สมมติปุ่ม delete เป็นปุ่มเดียวใน li)
      });

    // ตรวจสอบว่า tag หายไปแล้ว
    cy.contains(tagName).should("not.exist");
  });

  it("fails to delete tag if todos use it", () => {
    cy.visit("http://localhost:5173");

    const tagName = `UsedTag`;

    // เปิด dropdown สร้าง tag ใหม่
    cy.get("[data-cy='tag-select']").click();
    cy.get("[data-cy='add-tag-input']").type(tagName);
    cy.get("[data-cy='tag-add-button']").click();

    // รอ tag ใหม่แสดงในรายการ
    cy.get("[data-cy^='tag-item-']").contains(tagName).should("exist");

    // สร้าง todo ที่ใช้ tag นี้ (ถ้า UI ไม่มีฟีเจอร์นี้ อาจต้องใช้ API หรือ mock)
    // สมมติฟีเจอร์สร้าง todo พร้อมเลือก tag ผ่าน UI มี data-cy ที่เหมาะสม:
    const todoText = `Todo_${Date.now()}`;
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
        cy.get("button")
          .should("have.attr", "disabled");
      });
  });


  it("filters todos by selected tag correctly", () => {
    const url = Cypress.env("FRONTEND_URL");
    cy.visit(url);

    // สร้าง tag ใหม่
    const tagName = `FilterTag_${Date.now()}`;
    cy.get("[data-cy='tag-select']").click();
    cy.get("[data-cy='add-tag-input']").type(tagName);
    cy.get("[data-cy='tag-add-button']").click();
    cy.contains(tagName).should("exist");

    // สร้าง todo ใหม่ พร้อมกับใช้ tag นั้น
    const todoText = `Test Todo ${Date.now()}`;
    cy.get("[data-cy='input-text']").type(todoText);
    cy.get("[data-cy='tag-select']").click();
    cy.get("[data-cy^='tag-item-']").contains(tagName).click();
    cy.get("[data-cy='submit']").click();

    // ตรวจสอบว่า todo ถูกสร้าง
    cy.contains(todoText).should("exist");

    // เลือก tag ที่เพิ่งสร้างใน dropdown filter
    cy.get("select").select(tagName);

    // ตรวจสอบว่าแสดงเฉพาะ todo ที่มี tag นั้น
    cy.get("[data-cy='todo-item-wrapper']").should("have.length", 1);
    cy.get("[data-cy='todo-item-wrapper']").contains(todoText);
  });
});
