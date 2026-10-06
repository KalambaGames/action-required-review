import { jest } from '@jest/globals';

jest.unstable_mockModule( '@actions/core', () => ( { info: () => {} } ) );
jest.unstable_mockModule( '@actions/github', () => ( {
	context: { payload: { pull_request: { user: { login: 'Author' } } } },
} ) );
jest.unstable_mockModule( '../src/team-members.js', () => ( {
	fetchTeamMembers: async team => ( { devs: [ 'Alice', 'Bob', 'Carol' ], qa: [ 'Quinn' ] } )[ team ],
} ) );

const { Requirement } = await import( '../src/requirement.js' );

const needs = ( teams, reviewers ) =>
	new Requirement( { paths: [ '**' ], teams } ).needsReviewsFrom( reviewers );

describe( 'team with min', () => {
	test( 'satisfied when enough members approved', async () => {
		expect( await needs( [ { team: 'devs', min: 2 } ], [ 'Alice', 'Bob' ] ) ).toEqual( [] );
	} );

	test( 'not satisfied when too few members approved', async () => {
		expect( await needs( [ { team: 'devs', min: 2 } ], [ 'Alice', 'Quinn' ] ) ).toEqual( [ 'devs' ] );
	} );

	test( 'min defaults to 1', async () => {
		expect( await needs( [ { team: 'devs' } ], [ 'Carol' ] ) ).toEqual( [] );
	} );

	test( 'works inside all-of', async () => {
		const teams = [ { 'all-of': [ { team: 'devs', min: 2 }, 'qa' ] } ];
		expect( await needs( teams, [ 'Alice', 'Bob', 'Quinn' ] ) ).toEqual( [] );
		expect( await needs( teams, [ 'Alice', 'Quinn' ] ) ).toEqual( [ 'devs' ] );
		expect( await needs( teams, [ 'Alice', 'Bob' ] ) ).toEqual( [ 'qa' ] );
	} );

	test.each( [ [ { team: 'devs', min: 0 } ], [ { team: 'devs', min: '2' } ], [ { team: 'devs', count: 2 } ] ] )(
		'rejects invalid config %j',
		teamConfig => {
			expect( () => new Requirement( { paths: [ '**' ], teams: [ teamConfig ] } ) ).toThrow();
		}
	);
} );
