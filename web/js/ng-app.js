(function (angular, undercore) {
  angular.module('underscore', [])
    .factory('_', function () {
      return undercore;
    });

  angular.module('ng-app', ['underscore', 'angular-growl'])
    .controller('MainController', function ($scope, $http, growl, _) {
      $scope.questionList = undefined;
      $scope.currentQuestion = undefined;
      $scope.answers = [];

      $scope.doAnswer = function (questionId, answer) {
        $scope.currentQuestion.answer = answer;
        $scope.answers.push(answer);

        $scope.currentQuestion = $scope.currentQuestion.getNextQuestion();
      };

      generateQuestionList();

      function generateQuestionList() {
        $http.get('/data/questions.json')
          .success(function (data, status, headers, config) {
            $scope.questionList = new QuestionList(data);
            $scope.currentQuestion = $scope.questionList.getStartQuestion();
          })
          .error(function (data, status, headers, config) {
            growl.error('Cannot retrieve questions', {
              title: 'Error!'
            })
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
        this.answers = questionData.answers;
        //this.answers = _.map(questionData.answers, function (answerData) {
        //  return new Answer(answerData, this.questionList);
        //}, this);

        this.answer = undefined;
        this.getNextQuestion = function () {
          if (this.answer === undefined) return false;

          return _.findWhere(this.questionList.list, {
            id: this.answer.nextQuestionId
          });
        };

        this.hasNextQuestion = function () {
          return this.answer && this.answer.nextQuestionId !== undefined;
        };
      }

      function Answer(answerData, questionList) {
        this.questionList = questionList;

        this.id = answerData.id;
        this.answer = answerData.answer;
        var questions = _.find(questionList, function (question) {
          return !!(_.findWhere(question.answers, {id: answerData.id}));
        });
        console.log(questions);
        this.question = (questions && questions.length) > 0 ? questions[0] : undefined;
        this.nextQuestion = _.findWhere(questionList, {
          id: answerData.nextQuestionId
        });
      }
    });
})(window.angular, window._);