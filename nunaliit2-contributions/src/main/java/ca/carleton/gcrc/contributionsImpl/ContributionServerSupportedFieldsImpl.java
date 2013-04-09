/*
Copyright (c) 2010, Geomatics and Cartographic Research Centre, Carleton 
University
All rights reserved.

Redistribution and use in source and binary forms, with or without 
modification, are permitted provided that the following conditions are met:

 - Redistributions of source code must retain the above copyright notice, 
   this list of conditions and the following disclaimer.
 - Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.
 - Neither the name of the Geomatics and Cartographic Research Centre, 
   Carleton University nor the names of its contributors may be used to 
   endorse or promote products derived from this software without specific 
   prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE 
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE 
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN 
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE 
POSSIBILITY OF SUCH DAMAGE.

$Id$
*/
package ca.carleton.gcrc.contributionsImpl;

import java.sql.PreparedStatement;
import java.util.List;
import java.util.Map;

import ca.carleton.gcrc.contributions.ContributionsFieldSubset;
import ca.carleton.gcrc.dbSec.impl.ColumnDataUtils;

public class ContributionServerSupportedFieldsImpl extends ContributionsFieldSubsetImpl implements ContributionsFieldSubset {
	public ContributionServerSupportedFieldsImpl() throws Exception {
		super();
	}

	public void setAutoIncrementSequence(String fieldName, String autoIncrementSequence) {
		fieldMap.get(fieldName).setAutoIncrementSequence(autoIncrementSequence);
	}
	
	public void addParameterToPreparedStatement(
			PreparedStatement ps,
			String key,
			int index,
			Map<String, List<String>> fieldPairs) throws Exception {
		if ("id".equals(key) ||
				"place_id".equals(key) ||
				"create_ts".equals(key) ||
				"create_ms".equals(key)) { // field cannot be left null
			ColumnDataUtils.addRequiredParmToPreparedStatement(ps, key, index, fieldPairs.get(key), fieldMap.get(key));
		} else if ("filename".equals(key) ||
				"original_filename".equals(key) ||
				"mimetype".equals(key) ||
				"contributor_id".equals(key) ||
				"last_edit_timestamp".equals(key) ||
				"last_edit_id".equals(key) ||
				"file_size".equals(key)) { // field can be left null
			ColumnDataUtils.addOptionalParmToPreparedStatement(ps, key, index, fieldPairs.get(key), fieldMap.get(key));
		} else {
			throw new Exception("unexpected field key: "+key);
		}
	}
}