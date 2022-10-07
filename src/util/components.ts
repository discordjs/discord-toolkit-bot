import { container } from "tsyringe";
import type { Component } from "../Component.js";
import { kComponents } from "../tokens.js";

export function createComponents() {
	const components = new Map<string, Component>();
	container.register(kComponents, { useValue: components });

	return components;
}
