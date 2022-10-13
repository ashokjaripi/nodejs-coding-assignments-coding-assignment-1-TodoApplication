const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const { format, compareAsc } = require("date-fns");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "todoApplication.db");

let database = null;

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertTodoDBToResponseObject = (DBObject) => {
  return {
    id: DBObject.id,
    todo: DBObject.todo,
    category: DBObject.category,
    priority: DBObject.priority,
    status: DBObject.status,
    dueDate: DBObject.due_date,
  };
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const hasPriorityAndStatusProperty = (requestQuery) => {
  return (
    requestQuery.status !== undefined && requestQuery.priority !== undefined
  );
};

const hasCategoryAndStatusProperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndPriorityProperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

const isValidValue = async (columnName, requestQuery) => {
  try {
    const getRequestQuery = `SELECT * FROM todo WHERE ${columnName} = '${requestQuery}';`;
    const requestedQuery = await database.all(getRequestQuery);
    return requestedQuery;
  } catch (error) {
    console.log(`Error : ${error.message}`);
  }
};

app.get("/todos/", async (request, response) => {
  try {
    let data = null;
    let getTodosQuery = "";
    let columnName = null;
    let isUndefined = false;
    let inValidValue = "";
    const {
      search_q = "",
      status,
      priority,
      category,
      due_date,
    } = request.query;
    switch (true) {
      case hasStatusProperty(request.query):
        columnName = "status";
        if (isValidValue(columnName, status) === undefined) {
          isUndefined = true;
          inValidValue = "Status";
        } else {
          getTodosQuery = `
        SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND status = '${status}';`;
        }
        break;
      case hasPriorityProperty(request.query):
        columnName = "priority";
        if (isValidValue(columnName, priority) === null) {
          isUndefined = true;
          isValidValue = "Priority";
        } else {
          getTodosQuery = `
        SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND priority = '${priority}';`;
        }
        break;
      case hasCategoryProperty(request.query):
        columnName = "category";
        if (isValidValue(columnName, category) === undefined) {
          isUndefined = true;
          isValidValue = "Category";
        } else {
          getTodosQuery = `
        SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND category = '${category}';`;
        }
        break;
      case hasPriorityAndStatusProperty(request.query):
        if (isValidValue((columnName = "priority"), priority) === undefined) {
          isUndefined = true;
          isValidValue = "Priority";
        } else if (
          isValidValue((columnName = "status"), status) === undefined
        ) {
          isUndefined = true;
          isValidValue = "Status";
        } else {
          getTodosQuery = `
        SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND priority = '${priority}' AND status = '${status}';`;
        }
        break;
      case hasCategoryAndStatusProperty(request.query):
        if (isValidValue((columnName = "category"), category) === undefined) {
          isUndefined = true;
          isValidValue = "Category";
        } else if (
          isValidValue((columnName = "status"), status) === undefined
        ) {
          isUndefined = true;
          isValidValue = "Status";
        } else {
          getTodosQuery = `
        SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND category = '${category}' AND status = '${status}';`;
        }
        break;
      case hasCategoryAndPriorityProperty(request.query):
        if (isValidValue((columnName = "category"), category) === undefined) {
          isUndefined = true;
          isValidValue = "Category";
        } else if (
          isValidValue((columnName = "priority"), priority) === undefined
        ) {
          isUndefined = true;
          isValidValue = "Status";
        } else {
          getTodosQuery = `
        SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND category = '${category}' AND priority = '${priority}';`;
        }
        break;
      default:
        getTodosQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%';`;
    }
    if (isUndefined === false) {
      data = await database.all(getTodosQuery);
      response.send(data);
    } else {
      response.status(400);
      response.send(`Invalid Todo ${isValidValue}`);
    }
  } catch (error) {
    console.log(`Errors ${error.message}`);
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  try {
    const { todoId } = request.params;
    const getTodoQuery = ` 
    SELECT 
      *
    FROM todo 
    WHERE 
      id = ${todoId};`;
    const todoQuery = await database.get(getTodoQuery);
    response.send(convertTodoDBToResponseObject(todoQuery));
  } catch (error) {
    console.log(error.message);
  }
});

app.get("/agenda/", async (request, response) => {
  try {
    const { date } = request.query;
    const formedDate = format(new Date(date), "yyyy-MM-dd");
    const getTodoQuery = `
    SELECT * FROM todo WHERE due_date = ${formedDate};`;
    const todoQuery = await database.all(getTodoQuery);
    response.send(convertTodoDBToResponseObject(todoQuery));
  } catch (error) {
    console.log(error.message);
  }
});

app.post("/todos/", async (request, response) => {
  try {
    const { id, todo, priority, status, category, dueDate } = request.body;
    const postTodoQuery = `
    INSERT INTO 
     todo (id, todo , priority, status, category, due_date) 
    VALUES (id, '${todo}', '${todo}','${todo}','${todo}', ${dueDate});`;
    await database.run(postTodoQuery);
    response.send("Todo Successfully Added");
  } catch (error) {
    console.log(error.message);
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  try {
    const { todoId } = request.params;
    let updateColumn = "";
    const requestBody = request.body;
    switch (true) {
      case requestBody.todo !== undefined:
        updateColumn = "Todo";
        break;
      case requestBody.priority !== undefined:
        updateColumn = "Priority";
        break;
      case requestBody.status !== undefined:
        updateColumn = "Status";
        break;
      case requestBody.category !== undefined:
        updateColumn = "Category";
        break;
      case requestBody.dueDate !== undefined:
        updateColumn = "Due Date";
        break;
    }

    const previousTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
    const previousTodo = await database.get(previousTodoQuery);

    const {
      todo = previousTodo.todo,
      priority = previousTodo.priority,
      status = previousTodo.status,
      category = previousTodo.category,
      dueDate = previousTodo.due_date,
    } = request.body;

    const updateTodoQuery = `
        UPDATE todo 
        SET 
         todo = '${todo}',
         priority = '${priority}',
         status = '${status}',
         category = '${category}',
         due_date = ${dueDate}
        WHERE 
          id = ${todoId};`;
    await database.run(updateTodoQuery);
    response.send(`${updateColumn} Updated`);
  } catch (error) {
    console.log(error.message);
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  try {
    const { todoId } = request.params;
    const removeTodoQuery = `
        DELETE FROM 
          todo 
        WHERE 
          id = ${todoId};`;
    await database.run(removeTodoQuery);
    response.send("Todo Deleted");
  } catch (error) {
    console.log(error.message);
  }
});

module.exports = app;
