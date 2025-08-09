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
    cy.request({
      method: "GET",
      url: `${url}/todo`,
    }).then((res) => {
      // cy.log(JSON.stringify(res));
      expect(res.headers).to.not.have.property("access-control-allow-origin");
    });
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
  cy.request("PUT", `${url}/todo`, { todoText: "New Todo" }).then((res) => {
    expect(res.body).to.have.all.keys("msg", "data");
    expect(res.body.data).to.include.all.keys("id", "todoText");
    expect(res.body.data.ownerId).to.eq(null);
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
      cy.request({ method: "GET", url: `${url}/todo` }).then(function (res) {
        const currentId = this.currentId as string;
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
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

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
      const dueDates = todos.map((todo: any) => todo.dueDate?.split("T")[0]);
      const sorted = [...dueDates].sort();
      expect(dueDates).to.deep.equal(sorted);
    }
  );

  // =====================
  // New: auth backend tests (policy ใหม่)
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
    });
  });

  it("GET /todo: unauth sees only ownerId = NULL", () => {
    const url = Cypress.env("BACKEND_URL");

    // unauth create -> ownerId = NULL
    cy.request("PUT", `${url}/todo`, { todoText: "Public A" }).then(() => {
      cy.request("GET", `${url}/todo`).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an("array").and.have.length(1);
        expect(res.body[0].ownerId).to.eq(null);
      });
    });
  });

  it("GET /todo: logged-in user sees ONLY their own todos", () => {
    const url = Cypress.env("BACKEND_URL");
    const u1 = `alice_${Date.now()}`;
    const u2 = `bob_${Date.now() + 1}`;
    const password = "p@ssw0rd";

    // user A
    cy.request("POST", `${url}/auth/register`, { username: u1, password });
    cy.request("POST", `${url}/auth/login`, { username: u1, password });
    cy.request("PUT", `${url}/todo`, { todoText: "A1" });
    cy.request("PUT", `${url}/todo`, { todoText: "A2" });
    cy.request("GET", `${url}/todo`).then((res) => {
      const texts = res.body.map((t: any) => t.todoText);
      expect(texts).to.include.members(["A1", "A2"]);
      expect(texts).to.not.include("B1");
    });

    // switch to user B
    cy.request("POST", `${url}/auth/register`, { username: u2, password });
    cy.request("POST", `${url}/auth/login`, { username: u2, password });
    cy.request("PUT", `${url}/todo`, { todoText: "B1" });
    cy.request("GET", `${url}/todo`).then((res) => {
      const texts = res.body.map((t: any) => t.todoText);
      expect(texts).to.include("B1");
      expect(texts).to.not.include.members(["A1", "A2"]);
    });
  });

  it("permission: unauth cannot modify owned todo", () => {
    const url = Cypress.env("BACKEND_URL");
    const username = `owner_${Date.now()}`;
    const password = "p@ssw0rd";

    cy.request("POST", `${url}/auth/register`, { username, password });
    cy.request("POST", `${url}/auth/login`, { username, password });

    // create owned todo
    cy.request("PUT", `${url}/todo`, { todoText: "OwnedOnly" }).then((res) => {
      const todoId = res.body.data.id;

      // logout -> now unauth
      cy.request("POST", `${url}/auth/logout`);

      // try update without auth -> should fail (Permission denied)
      cy.request({
        method: "PATCH",
        url: `${url}/todo`,
        failOnStatusCode: false,
        body: { id: todoId, todoText: "Hacked" },
      }).then((res) => {
        expect(res.status).to.eq(500);
        expect(res.body.message || "").to.match(/permission denied/i);
      });

      // try delete without auth -> should fail
      cy.request({
        method: "DELETE",
        url: `${url}/todo`,
        failOnStatusCode: false,
        body: { id: todoId },
      }).then((res) => {
        expect(res.status).to.eq(500);
        expect(res.body.message || "").to.match(/permission denied/i);
      });
    });
  });

  it("permission: user B cannot modify user A's owned todo", () => {
    const url = Cypress.env("BACKEND_URL");
    const a = `userA_${Date.now()}`;
    const b = `userB_${Date.now() + 1}`;
    const password = "p@ssw0rd";

    // user A creates a todo
    cy.request("POST", `${url}/auth/register`, { username: a, password });
    cy.request("POST", `${url}/auth/login`, { username: a, password });
    cy.request("PUT", `${url}/todo`, { todoText: "A_only" }).then((res) => {
      const todoId = res.body.data.id;

      // switch to user B
      cy.request("POST", `${url}/auth/register`, { username: b, password });
      cy.request("POST", `${url}/auth/login`, { username: b, password });

      // B tries to update A's todo -> should fail
      cy.request({
        method: "PATCH",
        url: `${url}/todo`,
        failOnStatusCode: false,
        body: { id: todoId, todoText: "B_edit" },
      }).then((res) => {
        expect(res.status).to.eq(500);
        expect(res.body.message || "").to.match(/permission denied/i);
      });

      // B tries to delete A's todo -> should fail
      cy.request({
        method: "DELETE",
        url: `${url}/todo`,
        failOnStatusCode: false,
        body: { id: todoId },
      }).then((res) => {
        expect(res.status).to.eq(500);
        expect(res.body.message || "").to.match(/permission denied/i);
      });
    });
  });

  it("GET /todo respects tag filter under visibility rules", () => {
    const url = Cypress.env("BACKEND_URL");
    const username = `user_${Date.now()}`;
    const password = "p@ssw0rd";
    const tagName = `MyTag_${Date.now()}`;

    // create a tag
    cy.request("POST", `${url}/tags`, { name: tagName }).then((res) => {
      const tagId = res.body.data.id;

      // unauth create public todo with tag -> visible to unauth
      cy.request("PUT", `${url}/todo`, { todoText: "PublicTag", tagId });

      // register+login -> create owned todo with same tag (not visible to unauth)
      cy.request("POST", `${url}/auth/register`, { username, password });
      cy.request("POST", `${url}/auth/login`, { username, password });
      cy.request("PUT", `${url}/todo`, { todoText: "OwnedTag", tagId });

      // as logged-in: filter by tagId -> see only "OwnedTag"
      cy.request({ method: "GET", url: `${url}/todo`, qs: { tagId } }).then(
        (res1) => {
          const names1 = res1.body.map((t: any) => t.todoText);
          expect(names1).to.include("OwnedTag");
          expect(names1).to.not.include("PublicTag");
        }
      );

      // logout: unauth -> filter by tagId -> see only "PublicTag"
      cy.request("POST", `${url}/auth/logout`);
      cy.request({ method: "GET", url: `${url}/todo`, qs: { tagId } }).then(
        (res2) => {
          const names2 = res2.body.map((t: any) => t.todoText);
          expect(names2).to.include("PublicTag");
          expect(names2).to.not.include("OwnedTag");
        }
      );
    });
  });
});
