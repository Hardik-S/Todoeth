pragma solidity ^0.5.0;

contract TodoList {
	// similar to class variables in oop, these state variables represent the state of this smart contract and scopes the whole project
	// public enables reading of this unsigned interger state variable from outside this contract
	uint public taskCount = 0;

	struct Task {
		uint id;
		string content;
		bool completed;

	}

	// dynamic size key value pair (think expandable hashtable)
	mapping(uint => Task) public tasks;

	constructor() public {
		createTask("Pet Rythm or Kimchi");
	}
	function createTask(string memory _content) public {
		taskCount++;

		// create a new task in the list `tasks`
		tasks[taskCount] = Task(taskCount, _content, false);

	}

}