(function (angular, undercore, cy) {
  angular.module('underscore', [])
    .factory('_', function () {
      return undercore;
    });

  angular.module('cytoscape', [])
    .factory('cy', function () {
      return cytoscape
    });

  angular.module('ng-app', ['underscore', 'angular-growl', 'cytoscape'])
    .config(['growlProvider', function (growlProvider) {
      growlProvider.globalReversedOrder(true);
      growlProvider.globalTimeToLive(3000);
    }])
    .controller('MainController', function ($scope, $http, growl, _, cy) {
      $scope.showAnswers = true;
      $scope.showGraph = true;
      $scope.questionList = undefined;
      $scope.currentQuestion = undefined;
      $scope.answers = [];

      $scope.$watch('currentQuestion', function (newValue, oldValue) {
        if (cyObject !== undefined) {
          if (newValue !== undefined) {
            cyObject.elements("[id='q" + newValue.id + "']").addClass('highlighted');
          }

          if (newValue === undefined) {
            var resultId = $scope.answers[$scope.answers.length - 1].getResult().id;
            cyObject.edges("[id='q" + oldValue.id + "-r" + resultId + "']").addClass('highlighted');
            cyObject.elements("[id='r" + resultId + "']").css({'background-color': 'brown'});
          }

          if (oldValue !== undefined && newValue !== undefined) {
            cyObject.edges("[id='q" + oldValue.id + "-q" + newValue.id + "']").addClass('highlighted');
          }
        }
      });

      var cyObject, results;

      $scope.getResult = function () {
        var lastAnswer = $scope.answers[$scope.answers.length - 1];
        return lastAnswer && lastAnswer.resultId ? _.findWhere(results, {id: lastAnswer.resultId}) : false;
      };

      $scope.restart = function (withMessage) {
        withMessage = withMessage || false;

        $scope.answers = [];

        $scope.currentQuestion = $scope.questionList.getStartQuestion();

        var cyConfig = {
          zoomingEnabled: false,
          panningEnabled: false,
          container: document.getElementById('cy-container'),
          style: cy.stylesheet()
            .selector('edge')
            .css({
              'target-arrow-shape': 'triangle',
              'width': 2
            })
            .selector('.highlighted')
            .css({
              'background-color': '#61bffc',
              'line-color': '#61bffc',
              'target-arrow-color': '#61bffc',
              'transition-property': 'background-color, line-color, target-arrow-color',
              'transition-duration': '0.5s'
            }),
          layout: {
            name: 'preset',
            directed: true,
            padding: 10
          }
        };

        cyConfig.elements = {};
        cyConfig.elements.nodes = [];
        cyConfig.elements.edges = [];

        _.each(results, function (result) {
          cyConfig.elements.nodes.push({
            data: {id: 'r' + result.id},
            css: {
              'background-color': '#d9534f'
            },
            renderedPosition: result.position
          });
        });
        _.each($scope.questionList.list, function (question, index) {
          cyConfig.elements.nodes.push({
            data: {id: 'q' + question.id},
            renderedPosition: question.position,
            classes: index === 0 ? 'highlighted' : ''
          });
          if (_.all(question.answers, function (answer) {
              return answer.getNextQuestion() !== undefined;
            })) {
            _.each(question.answers, function (answer) {
              cyConfig.elements.edges.push({
                data: {
                  id: 'q' + answer.getQuestion().id + '-q' + answer.getNextQuestion().id,
                  source: 'q' + answer.getQuestion().id,
                  target: 'q' + answer.getNextQuestion().id
                },
                css: {
                  'line-color': answer.isPositive ? '#5cb85c' : '#d9534f',
                  'target-arrow-color': answer.isPositive ? '#5cb85c' : '#d9534f'
                }
              });
            });
          } else {
            _.each(question.answers, function (answer) {
              cyConfig.elements.edges.push({
                data: {
                  id: 'q' + answer.getQuestion().id + '-r' + answer.getResult().id,
                  source: 'q' + answer.getQuestion().id,
                  target: 'r' + answer.getResult().id
                },
                css: {
                  'line-color': answer.isPositive ? '#5cb85c' : '#d9534f',
                  'target-arrow-color': answer.isPositive ? '#5cb85c' : '#d9534f'
                }
              });
            });
          }
        });

        cyObject = cy(cyConfig);

        if (withMessage) {
          growl.success('Restarted');
        }
      };

      $scope.doAnswer = function (questionId, answer) {
        $scope.currentQuestion.answer = answer;
        $scope.answers.push(answer);
        $scope.currentQuestion = $scope.currentQuestion.getNextQuestion();
      };

      generateQuestionList();

      function generateQuestionList() {
        $http.get('data/questions.json')
          .success(function (data) {
            $scope.questionList = new QuestionList(data);
            results = data.results;
            $scope.restart();
          })
          .error(function (data) {
            growl.error('Cannot retrieve data with AJAX-request');
          });
      }

      function QuestionList(questionsData) {
        this.list = [];

        this.getStartQuestion = function () {
          return this.list[0];
        };

        _.each(questionsData.questions, function (question) {
          var questionObj = new Question(question, this);
          this.list.push(questionObj);
        }, this);
      }

      function Question(questionData, questionList) {
        this.questionList = questionList;

        this.id = questionData.id;
        this.question = questionData.question;
        this.position = questionData.position;
        this.answers = _.map(questionData.answers, function (answerData) {
          return new Answer(answerData, this.questionList);
        }, this);

        this.answer = undefined;

        this.getNextQuestion = function () {
          if (this.answer === undefined) return false;

          return this.answer.getNextQuestion();
        };

        this.hasNextQuestion = function () {
          return this.answer && this.answer.nextQuestionId !== undefined;
        };
      }

      function Answer(answerData, questionList) {
        this.questionList = questionList;

        this.id = answerData.id;
        this.answer = answerData.answer;
        this.nextQuestionId = answerData.nextQuestionId;
        this.resultId = answerData.resultId;
        this.position = answerData.position;
        this.isPositive = answerData.isPositive;

        this.getQuestion = function () {
          var _questionListFiltered = _.filter(this.questionList.list, function (question) {
            return !!_.findWhere(question.answers, {id: this.id})
          }, this);
          return _questionListFiltered ? _questionListFiltered[0] : false;
        };

        this.getNextQuestion = function () {
          return _.findWhere(this.questionList.list, {
            id: this.nextQuestionId
          }, this);
        };

        this.getResult = function () {
          return _.findWhere(results, {id: this.resultId});
        }
      }
    });
})
(window.angular, window._, window.cy);