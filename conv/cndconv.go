package main

import (
	"fmt"
	"io/ioutil"
	"os"
	"regexp"
)

func test() {

}

func main() {
	file, e := ioutil.ReadFile("./postsearch.json")
	if e != nil {
		fmt.Printf("File error: %v\n", e)
		os.Exit(1)
	}
	result := ""

	data := string(file)
	re := regexp.MustCompile("FlightScheme.{30,100}\"op\":\".\"")
	res := re.FindAllString(data, -1)

	reV := regexp.MustCompile("\"value\":.*\"op\":\".\"")
	for _, v := range res {
		j := reV.FindAllString(v, -1)
		// fmt.Printf("%v %s\n", k, j[0])
		result = result + "{" + j[0] + "},\n"
	}

	fmt.Println(result)
}
