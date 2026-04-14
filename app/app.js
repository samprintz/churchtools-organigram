import ct from '@churchtools/churchtools-client';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import tough from 'tough-cookie';
import fs from 'fs';

import Group from "./src/models/Group.js";
import Person from "./src/models/Person.js";
import GraphMLGraph from "./src/models/GraphMLGraph.js";
import GraphMLNode from "./src/models/GraphMLNode.js";
import GraphMLEdge from "./src/models/GraphMLEdge.js";

import "dotenv/config.js";

const BASEURL = process.env.BASEURL;
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

const LEADER_GROUP_TYPE_ROLE_IDS = process.env.LEADER_GROUP_TYPE_ROLE_IDS
	? process.env.LEADER_GROUP_TYPE_ROLE_IDS.split(',').map(Number)
	: [];

if (!BASEURL) {
	throw new Error("No env BASEURL set");
}

if (!EMAIL) {
	throw new Error("No env EMAIL set");
}

if (!PASSWORD) {
	throw new Error("No env PASSWORD set");
}

function initChurchToolsClient() {
	ct.churchtoolsClient.setCookieJar(axiosCookieJarSupport.default, new tough.CookieJar());
	ct.churchtoolsClient.setBaseUrl(BASEURL);
	ct.activateLogging(ct.LOG_LEVEL_ERROR);
}

function login(username, password) {
	return ct.churchtoolsClient.post('/login', {
		username,
		password
	});
}


initChurchToolsClient();
login(EMAIL, PASSWORD).then(() => {
	console.log('Login successful.');
	getData();
});

function getData() {
	var groups;
	var persons;
	var relations;
	var hierarchies;

	ct.churchtoolsClient.get('/groups').then(groupsResult => {
		groups = groupsResult;

		ct.churchtoolsClient.get('/persons', {
			"limit": 500
		}).then(personsResult => {
			persons = personsResult;

			ct.churchtoolsClient.get('/groups/members').then(relationsResult => {
				relations = relationsResult;

				ct.churchtoolsClient.get('/groups/hierarchies').then(hierarchiesResult => {
					hierarchies = hierarchiesResult;

					createRelatedData(persons, groups, hierarchies, relations);
				}).catch(error => console.log(error));
			}).catch(error => console.log(error));
		});
	});
}

function createRelatedData(persons, groups, hierarchies, relations) {
	console.log(`\nThe following data was received from ChurchTools:`)
	console.log(`Relations: ${relations.length}`);
	console.log(`Groups: ${groups.length}`);
	console.log(`Persons: ${persons.length}`);
	console.log(`Hierarchies: ${hierarchies.length}`);

	var topGroups = hierarchies.filter(hierarchy => hierarchy.parents.length === 0);

	var topGroupObjects = [];

	topGroups.forEach(group => {
		topGroupObjects.push(traverseGroup(group, hierarchies, persons, relations));
	});

	topGroupObjects.forEach(groupObject => {
		groupObject.children.forEach(child => toFile(`./output/${child.name}.graphml`, generateGroupGraph(child, hierarchies, relations).toXML()));

		toFile(`./output/${groupObject.name}.graphml`, generateGroupGraph(groupObject, hierarchies, relations).toXML());
	});
}

function traverseGroup(group, hierarchies, persons, relations) {
	var groupObject = new Group(group.groupId, group.group.title, [], group.group.domainType);


	group.children.forEach(id => {
		var filtered = hierarchies.filter(hierarchy => hierarchy.groupId === id);

		filtered.forEach(element => groupObject.children.push(traverseGroup(element, hierarchies, persons, relations)));
	});

	relations
		.filter(relation => LEADER_GROUP_TYPE_ROLE_IDS.includes(relation.groupTypeRoleId))
		.filter(relation => relation.groupId === group.groupId)
		.forEach(relation => {
		var personData = persons.filter(person => person.id === relation.personId)[0];
		if(personData != undefined){
			groupObject.persons.push(new Person(personData.id, personData.firstName, personData.lastName, relation.groupTypeRoleId));
		}
	});

	return groupObject;
}

function generateGroupGraph(group, hierarchies, relations) {
	var nodes = getNodes(group);
	var edges = getEdges(nodes, hierarchies, relations);

	console.log(`\nGroup: ${group.name}`);
	console.log(`	Graph Nodes: ${nodes.length}`);
	console.log(`	Graph Edges: ${edges.length}`);

	var graph = new GraphMLGraph(nodes, edges);

	return graph;
}

function getNodes(group) {
	var nodes = [];

	nodes.push(new GraphMLNode(group.id, group.name, "group"));

	group.persons.forEach(person => {
		nodes.push(new GraphMLNode(person.id, person.firstName + " " + person.lastName, "person"));
	});

	group.children.forEach(child => {
		nodes = nodes.concat(getNodes(child));
	});

	return filterNodes(nodes);
}

function filterNodes(nodes) {
	var filteredNodes = [];

	nodes.forEach(node => {
		if (filteredNodes.filter(filteredNode => filteredNode.id === node.id).filter(filteredNode => filteredNode.dataType === node.dataType).length == 0) {

			filteredNodes.push(node);
		}
	});

	return filteredNodes;
}

function getEdges(nodes, hierarchies, relations) {
	var edges = [];

	// Groups
	hierarchies.filter(hierarchy => hierarchy.children.length > 0).forEach(hierarchy => {
		var sourceNode = nodes.filter(node => node.id === hierarchy.groupId).filter(node => node.dataType === "group")[0];

		hierarchy.children.forEach(child => {
			var targetNode = nodes.filter(node => node.id === child).filter(child => child.dataType === "group")[0];

			if (!(sourceNode == undefined | targetNode == undefined)) {
				edges.push(new GraphMLEdge(sourceNode, targetNode));
			}
		});
	});

	// Persons
	relations.forEach(relation => {
		var sourceNode = nodes.filter(node => node.id === relation.groupId).filter(node => node.dataType === "group")[0];
		var targetNode = nodes.filter(node => node.id === relation.personId).filter(node => node.dataType === "person")[0];

		if (!(sourceNode == undefined | targetNode == undefined)) {
			edges.push(new GraphMLEdge(sourceNode, targetNode));
		}
	});

	return edges;
}

function toFile(filename, content) {
	if (fs.existsSync(`./${filename}`)) {
		fs.rmSync(`./${filename}`);
	}

	fs.writeFile(filename, content, function (err, data) {
		if (err) {
			return console.log(err);
		}
	});
}
