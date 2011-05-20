var testCase = new Y.Test.Case({
 
    name: "TestCase Name",
 
    //---------------------------------------------
    // Setup and tear down
    //---------------------------------------------
 
    setUp : function () {
        this.data = { name : "Nicholas", age : 28 };
    },
 
    tearDown : function () {
        delete this.data;
    },
 
    //---------------------------------------------
    // Tests
    //---------------------------------------------
 
    testName: function () {
        Y.Assert.areEqual("Nicholas", this.data.name, "Name should be 'Nicholas'");
    },
 
    testAge: function () {
        Y.Assert.areEqual(28, this.data.age, "Age should be 28");
    }    
});