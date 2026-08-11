const TodoList = artifacts.require("TodoList");

contract("TodoList", () => {
  it("seeds a task and creates new tasks", async () => {
    const todoList = await TodoList.new();

    assert.equal((await todoList.taskCount()).toNumber(), 1);
    const seededTask = await todoList.tasks(1);
    assert.equal(seededTask[1], "Pet Rythm or Kimchi");
    assert.equal(seededTask[2], false);

    await todoList.createTask("Review the transaction");
    assert.equal((await todoList.taskCount()).toNumber(), 2);
  });

  it("toggles completion for an existing task", async () => {
    const todoList = await TodoList.new();

    await todoList.toggleCompleted(1);
    assert.equal((await todoList.tasks(1))[2], true);

    await todoList.toggleCompleted(1);
    assert.equal((await todoList.tasks(1))[2], false);
  });

  it("rejects completion changes for unknown task ids", async () => {
    const todoList = await TodoList.new();

    try {
      await todoList.toggleCompleted(2);
      assert.fail("Expected an unknown task id to be rejected");
    } catch (error) {
      assert.include(error.message, "Task does not exist");
    }
  });

  it("rejects empty task content", async () => {
    const todoList = await TodoList.new();

    try {
      await todoList.createTask("");
      assert.fail("Expected empty task content to be rejected");
    } catch (error) {
      assert.include(error.message, "Task content cannot be empty");
    }
  });
});
