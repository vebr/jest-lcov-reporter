import { promises as fs } from "fs"
import core from "@actions/core"
import { GitHub, context } from "@actions/github"

import { parse } from "./lcov"
import { commentIdentifier, diff } from "./comment"

async function main() {
	const token = core.getInput("github-token")
	const name = core.getInput("name")
	const lcovFile = core.getInput("lcov-file") || "./coverage/lcov.info"
	const baseFile = core.getInput("lcov-base")
	const updateComment = core.getInput("update-comment")

	const raw = await fs.readFile(lcovFile, "utf-8").catch(err => null)
	if (!raw) {
		console.log(`No coverage report found at '${lcovFile}', exiting...`)
		return
	}

	const baseRaw =
		baseFile && (await fs.readFile(baseFile, "utf-8").catch(err => null))
	if (baseFile && !baseRaw) {
		console.log(`No coverage report found at '${baseFile}', ignoring...`)
	}

	const options = {
		name,
		repository: context.payload.repository.full_name,
		commit: context.payload.pull_request.head.sha,
		prefix: `${process.env.GITHUB_WORKSPACE}/`,
		head: context.payload.pull_request.head.ref,
		base: context.payload.pull_request.base.ref,
		workflowName: process.env.GITHUB_WORKFLOW,
	}

	const lcov = await parse(raw)
	const baselcov = baseRaw && (await parse(baseRaw))
	const body = await diff(lcov, baselcov, options)
	const githubClient = new GitHub(token)

	const createGitHubComment = () =>
		githubClient.issues.createComment({
			repo: context.repo.repo,
			owner: context.repo.owner,
			issue_number: context.payload.pull_request.number,
			body,
		})

	const updateGitHubComment = commentId =>
		githubClient.issues.updateComment({
			repo: context.repo.repo,
			owner: context.repo.owner,
			comment_id: commentId,
			body,
		})

	if (updateComment) {
		const issueComments = await githubClient.issues.listComments({
			repo: context.repo.repo,
			owner: context.repo.owner,
			issue_number: context.payload.pull_request.number,
		})

		const existingComment = issueComments.data.find(comment =>
			comment.body.includes(commentIdentifier(options.workflowName)),
		)

		if (existingComment) {
			await updateGitHubComment(existingComment.id)
			return
		}
	}

	await createGitHubComment()
}

export default main().catch(function(err) {
	console.log(err)
	core.setFailed(err.message)
})
