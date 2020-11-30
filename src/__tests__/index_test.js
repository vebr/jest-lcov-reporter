import core from "@actions/core"
import { promises as fs } from "fs"
import { GitHub } from "@actions/github"
import { parse } from "../lcov"
import { commentIdentifier, diff } from "../comment"

jest.mock("@actions/core", () => ({
	getInput: jest.fn(),
	setFailed: jest.fn(),
}))

jest.mock("@actions/github", () => ({
	GitHub: jest.fn(),
	context: {
		payload: {
			repository: { full_name: "name" },
			pull_request: {
				base: { ref: "base-ref" },
				head: { ref: "head-ref" },
				number: 1,
			},
		},
		repo: {
			repo: "repo",
			owner: "owner",
		},
	},
}))

jest.mock("fs", () => ({
	promises: {
		readFile: jest.fn(),
	},
}))

jest.mock("../lcov")
jest.mock("../comment")

let updateComment = false
beforeEach(() => {
	core.getInput.mockImplementation(arg => {
		if (arg === "github-token") return "GITHUB_TOKEN"
		if (arg === "name") return "NAME"
		if (arg === "lcov-file") return "LCOV_FILE"
		if (arg === "lcov-base") return "LCOV_BASE"
		if (arg === "update-comment") return updateComment
		return ""
	})

	parse.mockReturnValueOnce(Promise.resolve("report"))
	diff.mockReturnValueOnce(Promise.resolve("diff"))
})

afterEach(() => {
	jest.clearAllMocks()
})

test("it logs a message when lcov file does not exist", async () => {
	jest.spyOn(console, "log")
	fs.readFile.mockReturnValue(Promise.resolve(null))

	let module
	jest.isolateModules(() => {
		module = require("../index").default
	})

	await module

	expect(console.log).toHaveBeenCalledWith(
		"No coverage report found at 'LCOV_FILE', exiting...",
	)
})

test("it catches and logs if an error occurs", async () => {
	jest.spyOn(console, "log")

	fs.readFile
		.mockReturnValueOnce(Promise.resolve("file"))
		.mockReturnValueOnce(Promise.resolve(null))

	const error = new Error("Something went wrong...")
	const createCommentMock = jest.fn().mockReturnValue(Promise.reject(error))
	GitHub.mockReturnValue({
		issues: {
			createComment: createCommentMock,
		},
	})

	let module
	jest.isolateModules(() => {
		module = require("../index").default
	})

	await module

	expect(console.log).toHaveBeenCalledWith(error)
	expect(core.setFailed).toHaveBeenCalledWith(error.message)
})

test("a comment is created on the pull request with the coverage details", async () => {
	updateComment = false

	fs.readFile
		.mockReturnValueOnce(Promise.resolve("file"))
		.mockReturnValueOnce(Promise.resolve(null))

	const createCommentMock = jest.fn().mockReturnValue(Promise.resolve())
	GitHub.mockReturnValue({
		issues: {
			createComment: createCommentMock,
		},
	})

	let module
	jest.isolateModules(() => {
		module = require("../index").default
	})

	await module

	expect(createCommentMock).toHaveBeenCalledWith({
		repo: "repo",
		owner: "owner",
		issue_number: 1,
		body: "diff",
	})
})

describe("when update-comment is enabled", () => {
	test("a comment is created on the pull request when there is no comment to update", async () => {
		updateComment = true

		fs.readFile
			.mockReturnValueOnce(Promise.resolve("file"))
			.mockReturnValueOnce(Promise.resolve(null))

		const createCommentMock = jest.fn().mockReturnValue(Promise.resolve())
		GitHub.mockReturnValue({
			issues: {
				createComment: createCommentMock,
				listComments: jest.fn().mockReturnValue(Promise.resolve({ data: [] })),
			},
		})

		let module
		jest.isolateModules(() => {
			module = require("../index").default
		})

		await module

		expect(createCommentMock).toHaveBeenCalledWith({
			repo: "repo",
			owner: "owner",
			issue_number: 1,
			body: "diff",
		})
	})

	test("a comment is updated on the pull request when there is already a comment posted", async () => {
		updateComment = true

		fs.readFile
			.mockReturnValueOnce(Promise.resolve("file"))
			.mockReturnValueOnce(Promise.resolve(null))

		commentIdentifier.mockReturnValueOnce("COMMENT ID")

		const updateCommentMock = jest.fn().mockReturnValue(Promise.resolve())
		GitHub.mockReturnValue({
			issues: {
				updateComment: updateCommentMock,
				listComments: jest.fn().mockReturnValue(
					Promise.resolve({
						data: [{ id: 1, body: "Some content <!-- COMMENT ID -->" }],
					}),
				),
			},
		})

		let module
		jest.isolateModules(() => {
			module = require("../index").default
		})

		await module

		expect(updateCommentMock).toHaveBeenCalledWith({
			repo: "repo",
			owner: "owner",
			comment_id: 1,
			body: "diff",
		})
	})
})
