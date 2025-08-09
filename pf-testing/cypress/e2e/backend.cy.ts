before(() => {
  const url = Cypress.env("BACKEND_URL");
  cy.request("POST", `${url}/todo/all`);
});

beforeEach(() => {
  const url = Cypress.env("BACKEND_URL");
  cy.request("POST", `${url}/todo/all`);
  cy.request("POST", `${url}/tags/unused`);
});

describe("Backend", () => {
  it("checks env", () => {
    cy.log(JSON.stringify(Cypress.env()));
  });

  it("checks CORS header", () => {
    const url = Cypress.env("BACKEND_URL");
    cy.request({
      method: "GET",
      url: `${url}/todo`,
      headers: { Origin: "http://localhost:5173" }, // Origin เดียวกับ frontend
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.headers).to.have.property("access-control-allow-origin");
      expect(res.headers["access-control-allow-origin"])
        .to.be.oneOf(["http://localhost:5173", "*"]);
    });
  });

  it("checks get response", () => {
    const url = Cypress.env("BACKEND_URL");
    cy.request("GET", `${url}/todo`).then((res) => {
      expect(res.body).to.be.a("array");
    });
  });

  it("creates todo", () => {
    const url = Cypress.env("BACKEND_URL");
    cy.request("PUT", `${url}/todo`, { todoText: "New Todo" }).then((res) => {
      expect(res.body).to.have.all.keys("msg", "data");
      expect(res.body.data).to.include.all.keys("id", "todoText");
    });
  });

  it("deletes todo", () => {
    const url = Cypress.env("BACKEND_URL");
    cy.request("PUT", `${url}/todo`, { todoText: "New Todo" }).then((res) => {
      const todo = res.body.data;
      cy.request("DELETE", `${url}/todo`, { id: todo.id }).then((res) => {
        expect(res.body).to.have.all.keys("msg", "data");
        expect(res.body.data).to.have.all.keys("id");
      });
    });
  });

  it("updates todo", () => {
    const url = Cypress.env("BACKEND_URL");
    cy.request("PUT", `${url}/todo`, { todoText: "New Todo" }).then((res) => {
      const todo = res.body.data;
      cy.wrap(todo.id).as("currentId");
      cy.request("PATCH", `${url}/todo`, {
        id: todo.id,
        todoText: "Updated Text",
      }).then(() => {
        cy.request("GET", `${url}/todo`).then(function (res) {
          const currentId = this.currentId;
          const todos = res.body;
          const todo = todos.find((el: any) => el.id === currentId);
          expect(todo.todoText).to.equal("Updated Text");
        });
      });
    });
  });

  it("creates tag", () => {
    const url = Cypress.env("BACKEND_URL");
    const uniqueName = "TestTag1_" + Date.now();
    cy.request("POST", `${url}/tags`, { name: uniqueName }).then((res) => {
      expect(res.body).to.have.all.keys("msg", "data");
      expect(res.body.data).to.include.all.keys("id", "name");
      expect(res.body.data.name).to.equal(uniqueName);
    });
  });

  it("gets tag list", () => {
    const url = Cypress.env("BACKEND_URL");
    cy.request(`${url}/tags`).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.be.an("array");
    });
  });

  it("deletes tag", () => {
    const url = Cypress.env("BACKEND_URL");
    cy.request("POST", `${url}/tags`, { name: `TempTag_${Date.now()}` }).then(
      (res) => {
        const tagId = res.body.data.id;
        cy.request("DELETE", `${url}/tags/${tagId}`).then((res) => {
          expect(res.body).to.have.all.keys("msg", "data");
          expect(res.body.data.id).to.equal(tagId);
        });
      }
    );
  });

  it("creates todo with tag", () => {
    const url = Cypress.env("BACKEND_URL");
    const uniqueTagName = `TestTag2_${Date.now()}`;
    cy.request("POST", `${url}/tags`, { name: uniqueTagName }).then((res) => {
      const tagId = res.body.data.id;
      cy.request("PUT", `${url}/todo`, {
        todoText: "Todo with Tag",
        tagId,
      }).then((res) => {
        expect(res.body).to.have.all.keys("msg", "data");
        expect(res.body.data).to.include.all.keys("id", "todoText", "tagId");
        expect(res.body.data.tagId).to.equal(tagId);
      });
    });
  });

  it("filters todos by tagId", () => {
    const url = Cypress.env("BACKEND_URL");
    cy.request("POST", `${url}/tags`, {
      name: `FilterTag_${Date.now()}`,
    }).then(({ body }) => {
      const tagId = body.data.id;
      cy.request("PUT", `${url}/todo`, {
        todoText: "Filtered todo",
        tagId,
      }).then(() => {
        cy.request("GET", `${url}/todo`, { qs: { tagId } }).then(
          ({ body: todos }) => {
            expect(todos).to.be.an("array").that.is.not.empty;
            todos.forEach((todo: any) => {
              expect(todo.tagId).to.eq(tagId);
            });
          }
        );
      });
    });
  });

  it("deletes a tag if no todos use it", () => {
    const url = Cypress.env("BACKEND_URL");
    cy.request("POST", `${url}/tags`, { name: "TempDeleteTag" }).then(
      (tagRes) => {
        const tagId = tagRes.body.data.id;
        cy.request("DELETE", `${url}/tags/${tagId}`).then((delRes) => {
          expect(delRes.status).to.eq(200);
          expect(delRes.body.data.id).to.eq(tagId);
        });
      }
    );
  });

  it("fails to delete tag if todos use it", () => {
    const url = Cypress.env("BACKEND_URL");
    cy.request("POST", `${url}/tags`, { name: "TagUsed" }).then((tagRes) => {
      const tagId = tagRes.body.data.id;
      cy.request("PUT", `${url}/todo`, {
        todoText: "Todo using tag",
        tagId,
      }).then(() => {
        cy.request({
          method: "DELETE",
          url: `${url}/tags/${tagId}`,
          failOnStatusCode: false,
        }).then((res) => {
          expect(res.status).to.eq(400);
          expect(res.body).to.have.property("error");
        });
      });
    });
  });

  // DUE DATE TESTS

  it("creates todo with dueDate", () => {
    const url = Cypress.env("BACKEND_URL");
    const today = new Date().toISOString().split("T")[0];

    cy.request("PUT", `${url}/todo`, {
      todoText: "Todo with DueDate",
      dueDate: today,
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.data.dueDate).to.include(today);
    });
  });

  it("updates todo dueDate", () => {
    const url = Cypress.env("BACKEND_URL");
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000)
      .toISOString()
      .split("T")[0];

    cy.request("PUT", `${url}/todo`, {
      todoText: "Todo to update dueDate",
      dueDate: today,
    }).then((res) => {
      const todo = res.body.data;

      cy.request("PATCH", `${url}/todo`, {
        id: todo.id,
        todoText: "Todo to update dueDate",
        dueDate: tomorrow,
      }).then((updateRes) => {
        expect(updateRes.body.data.dueDate).to.include(tomorrow);
      });
    });
  });

  it("gets todos sorted by dueDate", () => {
    const url = Cypress.env("BACKEND_URL");

    const dates = [
      new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
      new Date(Date.now() + 86400000 * 1).toISOString().split("T")[0],
      new Date(Date.now()).toISOString().split("T")[0],
    ];

    cy.wrap(null).then(() => {
      for (const dueDate of dates) {
        cy.request("PUT", `${url}/todo`, {
          todoText: `Todo with dueDate ${dueDate}`,
          dueDate,
        });
      }
    });

    cy.request("GET", `${url}/todo`, { qs: { sortBy: "dueDate" } }).then(
      (res) => {
        const todos = res.body;
        const dueDates = todos.map(
          (todo: any) => todo.dueDate?.split("T")[0]
        );
        const sorted = [...dueDates].sort();
        expect(dueDates).to.deep.equal(sorted);
      }
    );
  });
});
