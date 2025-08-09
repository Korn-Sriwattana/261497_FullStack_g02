before(() => {
  const url = Cypress.env("BACKEND_URL");
  cy.request({ method: "POST", url: `${url}/todo/all` });
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

  it("checks CORS disabled", () => {
    const url = Cypress.env("BACKEND_URL");
    cy.request({ method: "GET", url: `${url}/todo` }).then((res) => {
      expect(res.headers).to.not.have.property("access-control-allow-origin");
    });
  });

  it("checks get response", () => {
    const url = Cypress.env("BACKEND_URL");
    cy.request({ method: "GET", url: `${url}/todo` }).then((res) => {
      expect(res.body).to.be.a("array");
    });
  });

  it("creates todo (no owner when not logged in)", () => {
    const url = Cypress.env("BACKEND_URL");
    cy.request({
      method: "PUT",
      url: `${url}/todo`,
      body: { todoText: "New Todo" },
    }).then((res) => {
      expect(res.body).to.have.all.keys("msg", "data");
      expect(res.body.data).to.include.all.keys("id", "todoText");
      expect(res.body.data.ownerId).to.eq(null);
    });
  });

  it("deletes todo", () => {
    const url = Cypress.env("BACKEND_URL");
    cy.request({
      method: "PUT",
      url: `${url}/todo`,
      body: { todoText: "New Todo" },
    }).then((res) => {
      const todo = res.body.data;
      cy.request({
        method: "DELETE",
        url: `${url}/todo`,
        body: { id: todo.id },
      }).then((res) => {
        expect(res.body).to.have.all.keys("msg", "data");
        expect(res.body.data).to.all.keys("id");
      });
    });
  });

  it("updates todo", () => {
    const url = Cypress.env("BACKEND_URL");
    cy.request({
      method: "PUT",
      url: `${url}/todo`,
      body: { todoText: "New Todo" },
    }).then((res) => {
      const todo = res.body.data;
      cy.wrap(todo.id).as("currentId");
      cy.request({
        method: "PATCH",
        url: `${url}/todo`,
        body: { id: todo.id, todoText: "Updated Text" },
      }).then(() => {
        cy.request({ method: "GET", url: `${url}/todo` }).then(function (res) {
          const currentId = this.currentId;
          const todos = res.body;
          const t = todos.find((el: any) => el.id === currentId);
          expect(t.todoText).to.equal("Updated Text");
        });
      });
    });
  });

  it("creates tag", () => {
    const url = Cypress.env("BACKEND_URL");
    const uniqueName = "TestTag1_" + Date.now();
    cy.request({
      method: "POST",
      url: `${url}/tags`,
      body: { name: uniqueName },
    }).then((res) => {
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
    cy.request({
      method: "POST",
      url: `${url}/tags`,
      body: { name: `TempTag_${Date.now()}` },
    }).then((res) => {
      const tagId = res.body.data.id;
      cy.request({
        method: "DELETE",
        url: `${url}/tags/${tagId}`,
      }).then((res) => {
        expect(res.body).to.have.all.keys("msg", "data");
        expect(res.body.data.id).to.equal(tagId);
      });
    });
  });

  it("creates todo with tag", () => {
    const url = Cypress.env("BACKEND_URL");
    const uniqueTagName = `TestTag2_${Date.now()}`;

    cy.request({
      method: "POST",
      url: `${url}/tags`,
      body: { name: uniqueTagName },
    }).then((res) => {
      const tagId = res.body.data.id;
      cy.request({
        method: "PUT",
        url: `${url}/todo`,
        body: { todoText: "Todo with Tag", tagId },
      }).then((res) => {
        expect(res.body).to.have.all.keys("msg", "data");
        expect(res.body.data).to.include.all.keys("id", "todoText", "tagId");
        expect(res.body.data.tagId).to.equal(tagId);
      });
    });
  });

  it("filters todos by tagId", () => {
    const url = Cypress.env("BACKEND_URL");
    cy.request({
      method: "POST",
      url: `${url}/tags`,
      body: { name: `FilterTag_${Date.now()}` },
    }).then(({ body }) => {
      const tagId = body.data.id;
      cy.request({
        method: "PUT",
        url: `${url}/todo`,
        body: { todoText: "Filtered todo", tagId },
      }).then(() => {
        cy.request({
          method: "GET",
          url: `${url}/todo`,
          qs: { tagId },
        }).then(({ body: todos }) => {
          expect(todos).to.be.an("array").that.is.not.empty;
          todos.forEach((todo: any) => expect(todo.tagId).to.eq(tagId));
        });
      });
    });
  });

  it("fails to delete tag if todos use it", () => {
    const url = Cypress.env("BACKEND_URL");
    cy.request({
      method: "POST",
      url: `${url}/tags`,
      body: { name: "TagUsed" },
    }).then((tagRes) => {
      const tagId = tagRes.body.data.id;
      cy.request({
        method: "PUT",
        url: `${url}/todo`,
        body: { todoText: "Todo using tag", tagId },
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
  // =====================
  // New: auth backend tests
  // =====================
  it("registers, logs in and creates owned todo", () => {
    const url = Cypress.env("BACKEND_URL");
    const username = `user_${Date.now()}`;
    const password = "p@ssw0rd";

    // register
    cy.request("POST", `${url}/auth/register`, { username, password })
      .its("status")
      .should("eq", 200);

    // login with cookie jar
    cy.request({
      method: "POST",
      url: `${url}/auth/login`,
      body: { username, password },
    }).then((loginRes) => {
      expect(loginRes.body.user.username).to.eq(username);

      // with cookies attached by cy.request automatically
      cy.request({
        method: "PUT",
        url: `${url}/todo`,
        body: { todoText: "Owned Todo" },
      }).then((res) => {
        expect(res.body.data.ownerId).to.be.a("string").and.not.be.empty;
      });
    })
  });
});
