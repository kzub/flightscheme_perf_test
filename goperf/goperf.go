package main

import (
	"fmt"
)

func main() {
	testCases := prepareTestCases()
	fmt.Println("done", testCases)
}

type cndParam struct {
	AndInverted bool
	From        string
	To          string
	Throught    string
	IsOW        bool
	IsRT        bool
}

func prepareTestCases() cndParam {
	return cndParam{}
}
