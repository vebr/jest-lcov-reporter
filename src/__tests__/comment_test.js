import { commentIdentifier, diff } from "../comment"
import { percentage } from "../lcov"
import { tabulate } from "../tabulate"

jest.mock("../lcov")
jest.mock("../tabulate")

describe("commentIdentifier", () => {
	test("a comment identifier is returned", function() {
		const result = commentIdentifier("workflow name")
		expect(result).toEqual("<!-- Code Coverage Comment: workflow name -->")
	})
})

describe("diff", () => {
	const options = {
		repository: "repo",
		commit: "commit-sha",
		prefix: "prefix",
		head: "head-ref",
		base: "base-ref",
		workflowName: "workflow name",
	}

	test("a comment is returned with the code coverage details", () => {
		percentage.mockReturnValueOnce(50)
		tabulate.mockReturnValueOnce("<LCOV_TABULATED_DATA>")

		const lcovData = "LCOV_DATA"
		const result = diff(lcovData, null, options)

		expect(percentage).toHaveBeenCalledWith(lcovData)
		expect(tabulate).toHaveBeenCalledWith(lcovData, options)

		expect(result).toContain("<h2>Code Coverage Report</h2>")
		expect(result).toContain(
			"<p>Coverage after merging <b>head-ref</b> into <b>base-ref</b></p>",
		)
		expect(result).toContain(
			"<table><tbody><tr><th>50.00%</th></tr></tbody></table>",
		)
		expect(result).toContain(
			"<details><summary>Coverage Report</summary><LCOV_TABULATED_DATA></details>",
		)
		expect(result).toContain("<!-- Code Coverage Comment: workflow name -->")
	})

	test("a comment is returned with provided name", () => {
		percentage.mockReturnValueOnce(50)
		tabulate.mockReturnValueOnce("<LCOV_TABULATED_DATA>")

		const lcovData = "LCOV_DATA"
		const result = diff(lcovData, null, { name: "Project Name", ...options })

		expect(result).toContain("<h2>Code Coverage Report: Project Name</h2>")
	})

	test("a comment is returned with code coverage details with the base line comparison (increase)", () => {
		percentage.mockReturnValueOnce(50).mockReturnValueOnce(70)
		tabulate.mockReturnValueOnce("<LCOV_TABULATED_DATA>")

		const lcovData = "LCOV_DATA"
		const lcovBeforeData = "LCOV_BEFORE_DATA"
		const result = diff(lcovData, lcovBeforeData, options)

		expect(result).toContain(
			"<table><tbody><tr><th>70.00%</th><th>▴ +20.00%</th></tr></tbody></table>",
		)
	})

	test("a comment is returned with code coverage details with the base line comparison (decrease)", () => {
		percentage.mockReturnValueOnce(50).mockReturnValueOnce(30)
		tabulate.mockReturnValueOnce("<LCOV_TABULATED_DATA>")

		const lcovData = "LCOV_DATA"
		const lcovBeforeData = "LCOV_BEFORE_DATA"
		const result = diff(lcovData, lcovBeforeData, options)

		expect(result).toContain(
			"<table><tbody><tr><th>30.00%</th><th>▾ -20.00%</th></tr></tbody></table>",
		)
	})

	test("a comment is returned with code coverage details with the base line comparison (no change)", () => {
		percentage.mockReturnValueOnce(50).mockReturnValueOnce(50)
		tabulate.mockReturnValueOnce("<LCOV_TABULATED_DATA>")

		const lcovData = "LCOV_DATA"
		const lcovBeforeData = "LCOV_BEFORE_DATA"
		const result = diff(lcovData, lcovBeforeData, options)

		expect(result).toContain(
			"<table><tbody><tr><th>50.00%</th><th> 0.00%</th></tr></tbody></table>",
		)
	})
})
