import {
	details,
	summary,
	b,
	fragment,
	table,
	tbody,
	tr,
	th,
	h2,
	p,
} from "./html"

import { percentage } from "./lcov"
import { tabulate } from "./tabulate"

function heading(name) {
	if (name) {
		return h2(`Code Coverage Report: ${name}`)
	} else {
		return h2(`Code Coverage Report`)
	}
}

function comment(lcov, table, options) {
	return fragment(
		heading(options.name),
		p(`Coverage after merging ${b(options.head)} into ${b(options.base)}`),
		table,
		"\n\n",
		details(summary("Coverage Report"), tabulate(lcov, options)),
		commentIdentifier(options.workflowName),
	)
}

export function commentIdentifier(workflowName) {
	return `<!-- Code Coverage Comment: ${workflowName} -->`
}

export function diff(lcov, before, options) {
	if (!before) {
		return comment(
			lcov,
			table(tbody(tr(th(percentage(lcov).toFixed(2), "%")))),
			options,
		)
	}

	const pbefore = percentage(before)
	const pafter = percentage(lcov)
	const pdiff = pafter - pbefore
	const plus = pdiff > 0 ? "+" : ""
	const arrow = pdiff === 0 ? "" : pdiff < 0 ? "▾" : "▴"

	return comment(
		lcov,
		table(
			tbody(
				tr(
					th(pafter.toFixed(2), "%"),
					th(arrow, " ", plus, pdiff.toFixed(2), "%"),
				),
			),
		),
		options,
	)
}
